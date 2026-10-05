import sqlite3
import uuid
import re
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from pathlib import Path

from models.memory_models import Memory, MemoryCreate, MemoryUpdate
from services.audit_service import AuditService
from config import MEMORY_DB_PATH


def _tokenize(text: str) -> set[str]:
    words = re.findall(r'\b[a-zA-Z0-9]+\b', text.lower())
    stop_words = {
        "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "with",
        "by", "from", "of", "about", "that", "this", "is", "are", "was", "were", "be",
        "been", "being", "i", "me", "my", "myself", "we", "our", "you", "your", "he",
        "she", "it", "they", "them", "what", "which", "who", "whom", "user"
    }
    stems = set()
    for w in words:
        if w not in stop_words and len(w) > 1:
            # Normalize common synonyms/stems
            if w in {"prefers", "likes", "preference", "preferring"}:
                stems.add("prefer")
            elif w in {"explanations", "explanation", "explain", "explaining"}:
                stems.add("explain")
            elif w.endswith("s") and len(w) > 3:
                stems.add(w[:-1])
            elif w.endswith("ing") and len(w) > 5:
                stems.add(w[:-3])
            else:
                stems.add(w)
    return stems


def _calculate_similarity(s1: str, s2: str) -> float:
    t1 = _tokenize(s1)
    t2 = _tokenize(s2)
    if not t1 or not t2:
        return 0.0
    intersection = t1.intersection(t2)
    union = t1.union(t2)
    jaccard = len(intersection) / len(union)
    overlap_coeff = len(intersection) / min(len(t1), len(t2))
    # Weighted combination of Jaccard and Overlap Coefficient
    return round((0.5 * jaccard) + (0.5 * overlap_coeff), 3)


# Conflict clusters for preference & procedural memories
CONFLICT_CLUSTERS = [
    ({"concise", "short", "brief", "terse", "quick"}, {"detailed", "depth", "verbose", "comprehensive", "long", "thorough"}),
    ({"dark", "dark_mode"}, {"light", "light_mode"}),
    ({"step", "steps", "step-by-step"}, {"summary", "summarized", "overview", "direct"}),
    ({"code_only", "pure_code"}, {"explained", "annotated", "explanation"}),
]


def are_conflicting_preferences(text1: str, text2: str) -> bool:
    """
    Determines if two preference or procedural instructions are mutually conflicting.
    E.g. 'User prefers concise answers' vs 'User prefers detailed answers'.
    """
    t1 = _tokenize(text1)
    t2 = _tokenize(text2)
    if not t1 or not t2:
        return False

    for group_a, group_b in CONFLICT_CLUSTERS:
        has_a1 = bool(t1.intersection(group_a))
        has_b1 = bool(t1.intersection(group_b))
        has_a2 = bool(t2.intersection(group_a))
        has_b2 = bool(t2.intersection(group_b))

        # Conflict if text1 has group A and text2 has group B, or vice versa
        if (has_a1 and has_b2) or (has_b1 and has_a2):
            return True

    return False


class MemoryManager:
    def __init__(self, db_path: Path = MEMORY_DB_PATH, audit_service: Optional[AuditService] = None):
        self.db_path = db_path
        self.audit_service = audit_service or AuditService(db_path=db_path)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    memory_type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    source TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    importance REAL NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    last_retrieved_at TEXT,
                    retrieval_count INTEGER NOT NULL DEFAULT 0,
                    status TEXT NOT NULL DEFAULT 'active'
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_memories_user_status ON memories(user_id, status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(memory_type)")
            conn.commit()

    def find_duplicate(self, user_id: str, memory_type: str, content: str, threshold: float = 0.65) -> Optional[Tuple[Memory, float]]:
        """
        Deduplication Strategy:
        Searches active memories of the same user and type.
        Uses token-based Jaccard similarity.
        If similarity >= threshold, identifies it as an existing duplicate/near-duplicate.
        """
        active_memories = self.list_memories(user_id=user_id, status="active", memory_type=memory_type)
        best_match: Optional[Memory] = None
        best_score = 0.0

        for mem in active_memories:
            sim = _calculate_similarity(content, mem.content)
            if sim > best_score:
                best_score = sim
                best_match = mem

        if best_match and best_score >= threshold:
            return (best_match, best_score)
        return None

    def find_conflicting_memories(self, user_id: str, memory_type: str, content: str, exclude_id: Optional[str] = None) -> List[Memory]:
        """
        Identifies any existing active preference or procedural memory that directly conflicts
        with the given instruction.
        """
        if memory_type not in ("preference", "procedural"):
            return []

        active_memories = self.list_memories(user_id=user_id, status="active")
        conflicts: List[Memory] = []
        for mem in active_memories:
            if exclude_id and mem.id == exclude_id:
                continue
            # Compare across preference and procedural types since both direct behavior
            if mem.memory_type in ("preference", "procedural"):
                if are_conflicting_preferences(content, mem.content):
                    conflicts.append(mem)
        return conflicts

    def create_memory(
        self,
        data: MemoryCreate,
        user_id: str,
        session_id: Optional[str] = None,
        deduplicate: bool = True
    ) -> Memory:
        # Check deduplication
        if deduplicate:
            dup_result = self.find_duplicate(user_id, data.memory_type, data.content)
            if dup_result:
                existing_mem, sim = dup_result
                # Update existing memory with highest confidence and updated timestamp
                updated_confidence = max(existing_mem.confidence, data.confidence)
                updated_importance = max(existing_mem.importance, data.importance)
                # If new content is more detailed or explicit, update content
                new_content = data.content if len(data.content) >= len(existing_mem.content) else existing_mem.content

                update_req = MemoryUpdate(
                    content=new_content,
                    confidence=updated_confidence,
                    importance=updated_importance,
                    source=data.source if data.source == "user_explicit" else existing_mem.source
                )
                updated = self.update_memory(
                    memory_id=existing_mem.id,
                    user_id=user_id,
                    update=update_req,
                    session_id=session_id
                )
                if updated:
                    return updated

        # Conflict Resolution: If new preference/procedural conflicts with an existing active one,
        # soft-delete the old conflicting memory so both are never active simultaneously.
        conflicts = self.find_conflicting_memories(user_id, data.memory_type, data.content)
        for old_conflict in conflicts:
            self.delete_memory(
                memory_id=old_conflict.id,
                user_id=user_id,
                session_id=session_id,
                soft=True,
                reason=f"Superseded by newer conflicting preference: '{data.content}'"
            )

        mem_id = f"MEM-{uuid.uuid4().hex[:8].upper()}"
        now_iso = datetime.now(timezone.utc).isoformat()

        # Validate with Pydantic
        memory = Memory(
            id=mem_id,
            user_id=user_id,
            memory_type=data.memory_type,
            content=data.content.strip(),
            source=data.source,
            confidence=data.confidence,
            importance=data.importance,
            created_at=now_iso,
            updated_at=now_iso,
            last_retrieved_at=None,
            retrieval_count=0,
            status="active"
        )

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO memories (
                    id, user_id, memory_type, content, source,
                    confidence, importance, created_at, updated_at,
                    last_retrieved_at, retrieval_count, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                memory.id, memory.user_id, memory.memory_type, memory.content, memory.source,
                memory.confidence, memory.importance, memory.created_at, memory.updated_at,
                memory.last_retrieved_at, memory.retrieval_count, memory.status
            ))
            conn.commit()

        # Audit creation
        self.audit_service.log_event(
            user_id=user_id,
            memory_id=memory.id,
            event_type="created",
            query=data.content,
            confidence=memory.confidence,
            injected=False,
            reason=f"Created via {data.source}",
            session_id=session_id,
            timestamp=now_iso
        )

        return memory

    def get_memory(self, memory_id: str, user_id: str) -> Optional[Memory]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM memories WHERE id = ? AND user_id = ?",
                (memory_id, user_id)
            )
            row = cursor.fetchone()
            if not row:
                return None
            return Memory(**dict(row))

    def list_memories(
        self,
        user_id: str,
        status: Optional[str] = "active",
        memory_type: Optional[str] = None
    ) -> List[Memory]:
        query = "SELECT * FROM memories WHERE user_id = ?"
        params: List[object] = [user_id]

        if status:
            query += " AND status = ?"
            params.append(status)

        if memory_type:
            query += " AND memory_type = ?"
            params.append(memory_type)

        query += " ORDER BY updated_at DESC"

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [Memory(**dict(r)) for r in rows]

    def update_memory(
        self,
        memory_id: str,
        user_id: str,
        update: MemoryUpdate,
        session_id: Optional[str] = None
    ) -> Optional[Memory]:
        current = self.get_memory(memory_id, user_id)
        if not current:
            return None

        now_iso = datetime.now(timezone.utc).isoformat()
        new_content = update.content.strip() if update.content is not None else current.content
        new_type = update.memory_type if update.memory_type is not None else current.memory_type
        new_source = update.source if update.source is not None else current.source
        new_confidence = update.confidence if update.confidence is not None else current.confidence
        new_importance = update.importance if update.importance is not None else current.importance
        new_status = update.status if update.status is not None else current.status

        # Pydantic validation
        validated = Memory(
            id=current.id,
            user_id=current.user_id,
            memory_type=new_type,
            content=new_content,
            source=new_source,
            confidence=new_confidence,
            importance=new_importance,
            created_at=current.created_at,
            updated_at=now_iso,
            last_retrieved_at=current.last_retrieved_at,
            retrieval_count=current.retrieval_count,
            status=new_status
        )

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE memories
                SET memory_type = ?, content = ?, source = ?,
                    confidence = ?, importance = ?, status = ?, updated_at = ?
                WHERE id = ? AND user_id = ?
            """, (
                validated.memory_type, validated.content, validated.source,
                validated.confidence, validated.importance, validated.status,
                validated.updated_at, validated.id, validated.user_id
            ))
            conn.commit()

        # If updated to active preference/procedural, deactivate any other conflicting memories
        if validated.status == "active" and validated.memory_type in ("preference", "procedural"):
            conflicts = self.find_conflicting_memories(user_id, validated.memory_type, validated.content, exclude_id=validated.id)
            for c in conflicts:
                self.delete_memory(
                    memory_id=c.id,
                    user_id=user_id,
                    session_id=session_id,
                    soft=True,
                    reason=f"Superseded by updated conflicting preference '{validated.id}': '{validated.content}'"
                )

        # Audit update with previous and current state
        change_desc = f"Updated content: '{current.content}' -> '{validated.content}' (type: {validated.memory_type}, status: {validated.status})"
        self.audit_service.log_event(
            user_id=user_id,
            memory_id=memory_id,
            event_type="updated",
            confidence=validated.confidence,
            injected=False,
            reason=change_desc,
            session_id=session_id,
            timestamp=now_iso
        )

        return validated

    def delete_memory(
        self,
        memory_id: str,
        user_id: str,
        session_id: Optional[str] = None,
        soft: bool = True,
        reason: Optional[str] = None
    ) -> bool:
        """
        Soft delete: sets status='deleted'.
        Preserves audit trail while permanently blocking injection.
        """
        current = self.get_memory(memory_id, user_id)
        if not current:
            return False

        now_iso = datetime.now(timezone.utc).isoformat()
        if soft:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE memories
                    SET status = 'deleted', updated_at = ?
                    WHERE id = ? AND user_id = ?
                """, (now_iso, memory_id, user_id))
                conn.commit()
        else:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM memories WHERE id = ? AND user_id = ?", (memory_id, user_id))
                conn.commit()

        # Audit deletion
        del_reason = reason or "User deleted memory (soft delete)"
        self.audit_service.log_event(
            user_id=user_id,
            memory_id=memory_id,
            event_type="deleted",
            confidence=current.confidence,
            injected=False,
            reason=del_reason,
            session_id=session_id,
            timestamp=now_iso
        )

        return True

    def mark_retrieved(self, memory_id: str, user_id: str):
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE memories
                SET retrieval_count = retrieval_count + 1,
                    last_retrieved_at = ?
                WHERE id = ? AND user_id = ?
            """, (now_iso, memory_id, user_id))
            conn.commit()
