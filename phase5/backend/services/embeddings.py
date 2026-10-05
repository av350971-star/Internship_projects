import numpy as np
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
from backend.config import settings

class EmbeddingService:
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL_NAME
        print(f"Loading embedding model: {self.model_name}...")
        self.model = SentenceTransformer(self.model_name)
        print("Embedding model loaded successfully.")

    def encode_text(self, text: str) -> List[float]:
        """Encodes a single string into a 384-dimensional vector."""
        vec = self.model.encode(text, normalize_embeddings=True)
        return vec.tolist()

    def encode_batch(self, texts: List[str]) -> List[List[float]]:
        """Encodes a batch of strings into normalized vectors."""
        if not texts:
            return []
        vecs = self.model.encode(texts, batch_size=32, normalize_embeddings=True, show_progress_bar=False)
        return vecs.tolist()

    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """Calculates cosine similarity between two normalized vectors."""
        if not vec1 or not vec2:
            return 0.0
        v1 = np.array(vec1, dtype=np.float32)
        v2 = np.array(vec2, dtype=np.float32)
        dot = np.dot(v1, v2)
        # Because vectors are normalized, dot product == cosine similarity
        return float(np.clip(dot, -1.0, 1.0))

    def search_dense(self, query: str, chunks: List[Dict[str, Any]], top_k: int = 10) -> List[Dict[str, Any]]:
        """
        Performs dense vector retrieval against a list of candidate chunks.
        Returns chunks sorted by cosine similarity score descending.
        """
        if not chunks:
            return []

        query_vec = self.model.encode(query, normalize_embeddings=True)

        scored_chunks = []
        for c in chunks:
            emb = c.get("embedding")
            if not emb:
                # If chunk has no precomputed embedding, generate one on the fly
                emb = self.model.encode(c["text_content"], normalize_embeddings=True).tolist()
                c["embedding"] = emb

            score = float(np.dot(query_vec, np.array(emb, dtype=np.float32)))
            # Direct positive cosine similarity
            normalized_score = max(0.0, float(score))

            chunk_copy = dict(c)
            chunk_copy["dense_score"] = round(normalized_score, 4)
            chunk_copy["raw_cosine"] = round(float(score), 4)
            scored_chunks.append(chunk_copy)

        scored_chunks.sort(key=lambda x: x["dense_score"], reverse=True)

        # Assign ranks
        for rank, item in enumerate(scored_chunks, start=1):
            item["dense_rank"] = rank

        return scored_chunks[:top_k]

# Global embedding service singleton
embedding_service = EmbeddingService()
