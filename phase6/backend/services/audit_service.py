import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from pathlib import Path

from models.response_models import AuditRecord
from config import MEMORY_DB_PATH


class AuditService:
    def __init__(self, db_path: Path = MEMORY_DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS memory_audit (
                    audit_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    memory_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    query TEXT,
                    relevance_score REAL,
                    confidence REAL,
                    injected INTEGER NOT NULL DEFAULT 0,
                    reason TEXT,
                    session_id TEXT,
                    timestamp TEXT NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_user ON memory_audit(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_memory ON memory_audit(memory_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_time ON memory_audit(timestamp)")
            conn.commit()

    def log_event(
        self,
        user_id: str,
        memory_id: str,
        event_type: str,
        query: Optional[str] = None,
        relevance_score: Optional[float] = None,
        confidence: Optional[float] = None,
        injected: bool = False,
        reason: Optional[str] = None,
        session_id: Optional[str] = None,
        timestamp: Optional[str] = None
    ) -> AuditRecord:
        audit_id = f"AUD-{uuid.uuid4().hex[:8].upper()}"
        ts = timestamp or datetime.now(timezone.utc).isoformat()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO memory_audit (
                    audit_id, user_id, memory_id, event_type, query,
                    relevance_score, confidence, injected, reason, session_id, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                audit_id,
                user_id,
                memory_id,
                event_type,
                query,
                relevance_score,
                confidence,
                1 if injected else 0,
                reason,
                session_id,
                ts
            ))
            conn.commit()

        return AuditRecord(
            audit_id=audit_id,
            user_id=user_id,
            memory_id=memory_id,
            event_type=event_type,  # type: ignore
            query=query,
            relevance_score=relevance_score,
            confidence=confidence,
            injected=injected,
            reason=reason,
            session_id=session_id,
            timestamp=ts
        )

    def get_audit_logs(
        self,
        user_id: str,
        limit: int = 100,
        memory_id: Optional[str] = None,
        event_type: Optional[str] = None
    ) -> List[AuditRecord]:
        query_sql = "SELECT * FROM memory_audit WHERE user_id = ?"
        params: List[object] = [user_id]

        if memory_id:
            query_sql += " AND memory_id = ?"
            params.append(memory_id)

        if event_type:
            query_sql += " AND event_type = ?"
            params.append(event_type)

        query_sql += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query_sql, params)
            rows = cursor.fetchall()
            return [
                AuditRecord(
                    audit_id=row["audit_id"],
                    user_id=row["user_id"],
                    memory_id=row["memory_id"],
                    event_type=row["event_type"],
                    query=row["query"],
                    relevance_score=row["relevance_score"],
                    confidence=row["confidence"],
                    injected=bool(row["injected"]),
                    reason=row["reason"],
                    session_id=row["session_id"],
                    timestamp=row["timestamp"]
                )
                for row in rows
            ]
