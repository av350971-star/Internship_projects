from typing import List, Dict, Any, Optional
from backend.config import settings
from backend.storage.sqlite_store import store
from backend.services.embeddings import embedding_service
from backend.services.bm25_retriever import bm25_retriever

class HybridSearchService:
    def __init__(self):
        self.default_alpha = settings.HYBRID_ALPHA

    def retrieve(
        self,
        query: str,
        tenant_id: str,
        search_mode: str = "hybrid",  # "hybrid", "dense", or "sparse"
        alpha: Optional[float] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Executes tenant-isolated retrieval.
        Modes:
        - 'dense': Pure vector search (semantic synonyms, concepts)
        - 'sparse': Pure BM25 search (exact keywords, error codes, IDs)
        - 'hybrid': Weighted combination of dense and sparse scores
        """
        if alpha is None:
            alpha = self.default_alpha

        # STRICT MULTI-TENANT ISOLATION:
        # Load only chunks belonging to this tenant_id
        tenant_chunks = store.get_chunks_by_tenant(tenant_id)
        if not tenant_chunks:
            return []

        # Retrieve top candidates for dense and sparse
        # We retrieve more candidates (e.g. 20) before merging
        candidate_pool_size = max(top_k * 3, 20)
        dense_results = embedding_service.search_dense(query, tenant_chunks, top_k=candidate_pool_size)
        sparse_results = bm25_retriever.search_sparse(query, tenant_chunks, top_k=candidate_pool_size)

        # Map by chunk ID
        dense_map = {c["id"]: c for c in dense_results}
        sparse_map = {c["id"]: c for c in sparse_results}

        all_ids = set(dense_map.keys()).union(set(sparse_map.keys()))

        merged_results = []
        for cid in all_ids:
            # Base chunk object
            base_chunk = dense_map.get(cid) or sparse_map.get(cid)
            
            d_item = dense_map.get(cid)
            s_item = sparse_map.get(cid)

            dense_score = d_item["dense_score"] if d_item else 0.0
            sparse_score = s_item["sparse_score"] if s_item else 0.0

            dense_rank = d_item["dense_rank"] if d_item else 999
            sparse_rank = s_item["sparse_rank"] if s_item else 999

            # Reciprocal Rank Fusion (RRF) with constant k=60
            rrf_score = (1.0 / (60 + dense_rank)) + (1.0 / (60 + sparse_rank))

            # Weighted normalized score
            if search_mode == "dense":
                final_score = dense_score
            elif search_mode == "sparse":
                final_score = sparse_score
            else:
                # Hybrid mode: weighted score combination
                final_score = (alpha * dense_score) + ((1.0 - alpha) * sparse_score)

            merged_item = dict(base_chunk)
            # Remove embedding vector to keep payload lightweight
            if "embedding" in merged_item:
                del merged_item["embedding"]

            merged_item["score"] = round(final_score, 4)
            merged_item["dense_score"] = dense_score
            merged_item["sparse_score"] = sparse_score
            merged_item["dense_rank"] = dense_rank
            merged_item["sparse_rank"] = sparse_rank
            merged_item["rrf_score"] = round(rrf_score, 5)
            merged_item["retrieval_mode"] = search_mode
            merged_results.append(merged_item)

        # Sort descending by final score
        merged_results.sort(key=lambda x: x["score"], reverse=True)

        # Assign final hybrid rank
        for rank, item in enumerate(merged_results, start=1):
            item["rank"] = rank

        return merged_results[:top_k]

    def compare_search_modes(
        self,
        query: str,
        tenant_id: str,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Retrieves side-by-side comparison of Dense vs Sparse vs Hybrid search
        for the given query and tenant.
        """
        dense_top = self.retrieve(query, tenant_id, search_mode="dense", top_k=top_k)
        sparse_top = self.retrieve(query, tenant_id, search_mode="sparse", top_k=top_k)
        hybrid_top = self.retrieve(query, tenant_id, search_mode="hybrid", top_k=top_k)

        # Analysis summary
        top_dense_title = dense_top[0]["doc_filename"] if dense_top else "None"
        top_sparse_title = sparse_top[0]["doc_filename"] if sparse_top else "None"
        top_hybrid_title = hybrid_top[0]["doc_filename"] if hybrid_top else "None"

        summary = (
            f"Query: '{query}' | Tenant: '{tenant_id}'. "
            f"Dense top document: {top_dense_title}. "
            f"Sparse (BM25) top document: {top_sparse_title}. "
            f"Hybrid fused top document: {top_hybrid_title}."
        )

        return {
            "query": query,
            "tenant_id": tenant_id,
            "dense_results": dense_top,
            "sparse_results": sparse_top,
            "hybrid_results": hybrid_top,
            "summary": summary
        }

hybrid_search_service = HybridSearchService()
