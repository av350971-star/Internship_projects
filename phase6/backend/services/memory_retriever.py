import re
from typing import List, Tuple, Optional
from models.memory_models import Memory, MemoryRetrievalResult
from services.memory_manager import MemoryManager
from services.audit_service import AuditService
from config import (
    MEMORY_RELEVANCE_THRESHOLD,
    MEMORY_CONFIDENCE_THRESHOLD,
)


def _normalize_tokens(text: str) -> set[str]:
    # Normalize special programming language identifiers before word boundary extraction
    normalized_text = text.lower()
    normalized_text = re.sub(r'\bc\+\+', 'cpp', normalized_text)
    normalized_text = re.sub(r'\bc#', 'csharp', normalized_text)
    normalized_text = re.sub(r'\.net\b', 'dotnet', normalized_text)

    # Extract all alphanumeric words, breaking hyphens and underscores
    words = re.findall(r'\b[a-zA-Z0-9]+\b', normalized_text)
    stop_words = {
        "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "with",
        "by", "from", "of", "about", "that", "this", "is", "are", "was", "were", "be",
        "been", "being", "i", "me", "my", "myself", "we", "our", "you", "your", "he",
        "she", "it", "they", "them", "what", "which", "who", "whom", "user", "please",
        "can", "could", "would", "tell", "show", "give"
    }
    stems = set()
    for w in words:
        if w not in stop_words and len(w) > 1:
            if w in {"explanations", "explanation", "explain", "explaining", "answer", "answers", "response", "responses", "reply", "replies", "describe", "description"}:
                stems.add("explain")
            elif w in {"programming", "program", "code", "coding", "script", "scripting", "development", "develop"}:
                stems.add("code")
            elif w in {"prefers", "preference", "prefer", "preferred", "prefered", "likes", "like", "favorite"}:
                stems.add("prefer")
            elif w in {"bugs", "bug", "debug", "debugging", "error", "errors", "issue", "issues", "fix", "fixing"}:
                stems.add("debug")
            elif w.endswith("ing") and len(w) > 5:
                stems.add(w[:-3])
            elif w.endswith("s") and len(w) > 3:
                stems.add(w[:-1])
            elif w.endswith("ed") and len(w) > 4:
                stems.add(w[:-2])
            elif w.endswith("ly") and len(w) > 4:
                stems.add(w[:-2])
            else:
                stems.add(w)
    return stems


class MemoryRetriever:
    def __init__(
        self,
        memory_manager: MemoryManager,
        audit_service: AuditService,
        relevance_threshold: float = MEMORY_RELEVANCE_THRESHOLD,
        confidence_threshold: float = MEMORY_CONFIDENCE_THRESHOLD
    ):
        self.memory_manager = memory_manager
        self.audit_service = audit_service
        self.relevance_threshold = relevance_threshold
        self.confidence_threshold = confidence_threshold

    def calculate_relevance(self, query: str, memory: Memory) -> float:
        """
        Calculates raw semantic/keyword relevance between user query and memory.
        Returns a float between 0.0 and 1.0.
        """
        query_tokens = _normalize_tokens(query)
        memory_tokens = _normalize_tokens(memory.content)

        if not query_tokens or not memory_tokens:
            return 0.0

        overlap = query_tokens.intersection(memory_tokens)
        if not overlap:
            # Check for direct substring match (e.g. cpp, sql, git, api)
            lower_q = query.lower()
            lower_m = memory.content.lower()
            if any(t in lower_q for t in memory_tokens if len(t) >= 3):
                return 0.35
            return 0.0

        # Jaccard component
        jaccard = len(overlap) / len(query_tokens.union(memory_tokens))

        # Query coverage component (what proportion of memory concepts appear in query)
        memory_coverage = len(overlap) / len(memory_tokens)

        # Base overlap score
        base_score = (0.4 * jaccard) + (0.6 * memory_coverage)

        # Domain/task affinity boost
        affinity = 0.0
        lower_q = query.lower()
        if memory.memory_type == "preference":
            # If user is asking for assistance or an explanation, preference memory is highly pertinent
            pref_cues = ["explain", "code", "write", "how", "step", "example", "python", "cpp", "c++", "java", "javascript", "help", "solve"]
            if any(cue in lower_q for cue in pref_cues):
                affinity += 0.20
        elif memory.memory_type == "procedural":
            # Procedural cues for instructions on how tasks should be performed
            proc_cues = ["how", "step", "code", "debug", "api", "explain", "instruction", "procedure", "perform", "first", "example", "format", "write", "fix"]
            if any(cue in lower_q for cue in proc_cues):
                affinity += 0.20
        elif memory.memory_type == "episodic":
            past_cues = ["before", "previous", "again", "earlier", "project", "last time", "remember"]
            if any(cue in lower_q for cue in past_cues):
                affinity += 0.20
        elif memory.memory_type == "semantic":
            sem_cues = ["know", "learn", "my", "about", "project", "work", "stack"]
            if any(cue in lower_q for cue in sem_cues):
                affinity += 0.15

        # Scale and cap
        raw_relevance = min(1.0, (base_score * 0.8) + affinity)
        return round(raw_relevance, 3)

    def calculate_final_score(self, relevance_score: float, confidence: float, importance: float) -> float:
        """
        Standard formula:
        final_score = (relevance_score * 0.50) + (confidence * 0.30) + (importance * 0.20)
        """
        score = (relevance_score * 0.50) + (confidence * 0.30) + (importance * 0.20)
        return round(score, 3)

    def retrieve(
        self,
        query: str,
        user_id: str,
        session_id: Optional[str] = None
    ) -> List[MemoryRetrievalResult]:
        """
        Retrieves user's active memories, scores each, applies dual threshold filtering,
        logs 'retrieved' and 'rejected' audit events, and updates retrieval counts.
        """
        active_memories = self.memory_manager.list_memories(user_id=user_id, status="active")
        results: List[MemoryRetrievalResult] = []

        for mem in active_memories:
            relevance = self.calculate_relevance(query, mem)
            final_score = self.calculate_final_score(relevance, mem.confidence, mem.importance)

            # Check eligibility against both gates
            reasons = []
            if final_score < self.relevance_threshold:
                reasons.append(f"Below relevance threshold (final_score {final_score:.2f} < {self.relevance_threshold:.2f})")
            if mem.confidence < self.confidence_threshold:
                reasons.append(f"Below confidence threshold (confidence {mem.confidence:.2f} < {self.confidence_threshold:.2f})")

            is_eligible = len(reasons) == 0
            rejection_reason = "; ".join(reasons) if reasons else None

            # Audit event: retrieved
            self.audit_service.log_event(
                user_id=user_id,
                memory_id=mem.id,
                event_type="retrieved",
                query=query,
                relevance_score=relevance,
                confidence=mem.confidence,
                injected=False,
                reason=f"Retrieved with final_score: {final_score:.2f}",
                session_id=session_id
            )

            # If rejected by threshold, log rejected audit event
            if not is_eligible:
                self.audit_service.log_event(
                    user_id=user_id,
                    memory_id=mem.id,
                    event_type="rejected",
                    query=query,
                    relevance_score=relevance,
                    confidence=mem.confidence,
                    injected=False,
                    reason=rejection_reason,
                    session_id=session_id
                )

            # Update retrieval counter on memory
            self.memory_manager.mark_retrieved(mem.id, user_id)

            result = MemoryRetrievalResult(
                memory=mem,
                relevance_score=relevance,
                confidence=mem.confidence,
                importance=mem.importance,
                final_score=final_score,
                is_eligible=is_eligible,
                rejection_reason=rejection_reason
            )
            results.append(result)

        # Sort all evaluated memories by final_score descending
        results.sort(key=lambda r: r.final_score, reverse=True)
        return results
