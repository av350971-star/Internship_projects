"""
Vector RAG Retriever Engine:
Implements real semantic vector retrieval using ChromaDB and Sentence-Transformers (all-MiniLM-L6-v2).
Enforces post-retrieval role-based access control (RBAC) before candidate documents enter the context.
"""

import json
from pathlib import Path
from typing import List, Dict, Optional
import chromadb
from sentence_transformers import SentenceTransformer

from .config import (
    DATA_DIR,
    EMBEDDING_MODEL,
    DEFAULT_MAX_RETRIEVED_DOCS,
    ROLE_CUSTOMER,
    ROLE_SUPPORT_AGENT,
    estimate_tokens
)

class VectorDocumentRetriever:
    def __init__(self, data_file: Path = DATA_DIR / "documents.json"):
        self.data_file = data_file
        self.documents: List[Dict] = []
        self._model = None
        self._client = None
        self._collection = None

        self._init_vector_store()

    @property
    def model(self) -> SentenceTransformer:
        if self._model is None:
            self._model = SentenceTransformer(EMBEDDING_MODEL)
        return self._model

    def _init_vector_store(self):
        """Loads support documents and ingests them into ChromaDB with semantic embeddings."""
        if not self.data_file.exists():
            print(f"Warning: Document data file not found at {self.data_file}")
            return

        with open(self.data_file, "r", encoding="utf-8") as f:
            self.documents = json.load(f)

        # Initialize ephemeral in-memory ChromaDB client
        self._client = chromadb.Client()
        # Reset or create collection
        try:
            self._client.delete_collection("support_knowledge_base")
        except Exception:
            pass
        self._collection = self._client.create_collection(
            name="support_knowledge_base",
            metadata={"hnsw:space": "cosine"}
        )

        # Ingestion pipeline: Loader -> Metadata Enrichment -> Embedding -> ChromaDB
        doc_texts = []
        doc_metadatas = []
        doc_ids = []

        for doc in self.documents:
            doc_id = doc.get("id", "UNKNOWN")
            title = doc.get("title", "")
            summary = doc.get("summary", "")
            content = doc.get("content", "")
            allowed_roles = doc.get("allowed_roles", [ROLE_SUPPORT_AGENT])
            
            # Category: public if customer-allowed, else internal
            category = "public" if ROLE_CUSTOMER in allowed_roles else "internal"

            # Enriched text for semantic search
            enriched_chunk = f"Title: {title}\nSummary: {summary}\nContent: {content}"
            doc_texts.append(enriched_chunk)
            doc_ids.append(doc_id)

            doc_metadatas.append({
                "document_id": doc_id,
                "title": title,
                "category": category,
                "allowed_roles_str": ",".join(allowed_roles),
                "source": "documents.json",
                "summary": summary,
                "content": content
            })

        if doc_texts:
            embeddings = self.model.encode(doc_texts, convert_to_numpy=True).tolist()
            self._collection.add(
                ids=doc_ids,
                embeddings=embeddings,
                metadatas=doc_metadatas,
                documents=doc_texts
            )

    def retrieve(
        self,
        query: str,
        user_role: str,
        top_k: int = DEFAULT_MAX_RETRIEVED_DOCS
    ) -> Dict:
        """
        Executes vector search and applies strict role-based permission filtering:
        User Query -> Vector Search -> Candidate Documents -> Permission Filter -> Allowed Documents
        Unauthorized documents are blocked from entering the context.
        """
        if not query.strip() or self._collection is None:
            return {
                "retrieved_documents": [],
                "blocked_count": 0,
                "blocked_categories": [],
                "allowed_count": 0
            }

        # Step 1: Embed query using SentenceTransformer
        query_embedding = self.model.encode([query], convert_to_numpy=True).tolist()

        # Step 2: Retrieve top candidates from ChromaDB
        n_candidates = min(len(self.documents), max(top_k * 2, 4))
        results = self._collection.query(
            query_embeddings=query_embedding,
            n_results=n_candidates
        )

        allowed_docs = []
        blocked_docs = []

        if results and results.get("metadatas") and len(results["metadatas"]) > 0:
            metas = results["metadatas"][0]
            distances = results["distances"][0] if results.get("distances") else [0.0] * len(metas)

            for meta, dist in zip(metas, distances):
                # Cosine similarity score
                similarity_score = round(max(0.0, 1.0 - float(dist)), 3)
                allowed_roles = meta.get("allowed_roles_str", "").split(",")
                category = meta.get("category", "internal")

                # Step 3: Role Permission Filter
                is_authorized = user_role in allowed_roles

                if is_authorized:
                    if len(allowed_docs) < top_k:
                        allowed_docs.append({
                            "id": meta.get("document_id"),
                            "title": meta.get("title"),
                            "category": category,
                            "summary": meta.get("summary"),
                            "content": meta.get("content"),
                            "allowed_roles": allowed_roles,
                            "relevance_score": similarity_score,
                            "token_count": estimate_tokens(meta.get("content", ""))
                        })
                else:
                    # Record ONLY safe metadata for blocked documents; NEVER leak content
                    blocked_docs.append({
                        "document_id": meta.get("document_id"),
                        "title": meta.get("title"),
                        "category": category
                    })

        blocked_categories = list(set(b["category"] for b in blocked_docs))

        return {
            "retrieved_documents": allowed_docs,
            "blocked_count": len(blocked_docs),
            "blocked_categories": blocked_categories,
            "allowed_count": len(allowed_docs)
        }

    def get_documents_for_role(self, role: str) -> List[Dict]:
        """
        Role-aware documents endpoint provider:
        - Customer: receives ONLY public support documents.
        - Support Agent: receives public + internal documents.
        Never returns internal document content to customers.
        """
        filtered = []
        for doc in self.documents:
            allowed = doc.get("allowed_roles", [])
            if role in allowed:
                # Safe public/authorized entry
                filtered.append({
                    "id": doc.get("id"),
                    "title": doc.get("title"),
                    "category": "public" if ROLE_CUSTOMER in allowed else "internal",
                    "allowed_roles": allowed,
                    "summary": doc.get("summary", ""),
                    "content": doc.get("content", "")
                })
        return filtered

# Global singleton
document_retriever = VectorDocumentRetriever()
