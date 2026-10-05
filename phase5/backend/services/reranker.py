import re
from typing import List, Dict, Any, Tuple
from backend.config import settings

class RerankerAndRefinementService:
    def __init__(self):
        self.threshold = settings.MIN_CONFIDENCE_THRESHOLD

    @staticmethod
    def calculate_term_overlap(query: str, text: str) -> float:
        """
        Calculates lexical query term overlap ratio against chunk text.
        Helps refine retrieval when exact query keywords are mentioned.
        """
        query_words = set(re.findall(r'\b[a-zA-Z0-9_\-\.]{3,}\b', query.lower()))
        if not query_words:
            return 0.0
        text_words = set(re.findall(r'\b[a-zA-Z0-9_\-\.]{3,}\b', text.lower()))
        matched = query_words.intersection(text_words)
        return len(matched) / len(query_words)

    def refine_and_rerank(
        self,
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Refines candidate chunks using a combination of hybrid similarity
        and lexical term overlap.
        """
        if not retrieved_chunks:
            return []

        reranked = []
        for c in retrieved_chunks:
            overlap = self.calculate_term_overlap(query, c["text_content"])
            hybrid_score = c.get("score", 0.0)

            # Combined refined score (70% hybrid relevance + 30% lexical overlap boost)
            refined_score = round(0.70 * hybrid_score + 0.30 * overlap, 4)

            item = dict(c)
            item["term_overlap"] = round(overlap, 4)
            item["refined_score"] = refined_score
            reranked.append(item)

        # Sort descending by refined score
        reranked.sort(key=lambda x: x["refined_score"], reverse=True)

        for rank, item in enumerate(reranked, start=1):
            item["refined_rank"] = rank

        return reranked[:top_k]

    def evaluate_evidence(
        self,
        query: str,
        refined_chunks: List[Dict[str, Any]],
        threshold: float = None
    ) -> Tuple[bool, str, float]:
        """
        Decision gate: Checks whether the retrieved evidence is strong enough to answer.
        Returns:
            (is_weak_evidence: bool, reason: str, highest_score: float)
        """
        thresh = threshold if threshold is not None else self.threshold

        if not refined_chunks:
            return (
                True,
                f"No relevant document chunks found for the current tenant. (Available chunks: 0)",
                0.0
            )

        highest_score = max(c.get("score", 0.0) for c in refined_chunks)
        highest_refined = max(c.get("refined_score", 0.0) for c in refined_chunks)

        # If even the best chunk is below our evidence threshold
        if highest_score < thresh and highest_refined < thresh:
            return (
                True,
                (
                    f"Evidence is insufficient. The highest relevance score is {highest_score:.3f}, "
                    f"which is below the minimum confidence threshold ({thresh:.2f})."
                ),
                highest_score
            )

        return (False, "Evidence is sufficient.", highest_score)

reranker_service = RerankerAndRefinementService()
