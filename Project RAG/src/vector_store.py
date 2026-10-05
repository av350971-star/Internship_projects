import os
from typing import List, Dict, Any, Optional
import chromadb
from sentence_transformers import SentenceTransformer
import numpy as np


class VectorStoreManager:
    """
    ChromaDB-backed Persistent Vector Store Manager.
    Manages embedding generation, dual collections for chunking configurations,
    filtering, distance conversion, and vector inspection.
    """
    
    COLLECTION_CONFIG_A = "rag_chunks_config_a"
    COLLECTION_CONFIG_B = "rag_chunks_config_b"
    MODEL_NAME = "all-MiniLM-L6-v2"
    
    def __init__(self, persist_directory: str = "results/chroma_db"):
        self.persist_directory = persist_directory
        os.makedirs(self.persist_directory, exist_ok=True)
        
        # Initialize persistent Chroma client
        self.client = chromadb.PersistentClient(path=self.persist_directory)
        
        # Initialize embedding model
        self.embed_model = SentenceTransformer(self.MODEL_NAME)
        self.embedding_dim = self.embed_model.get_embedding_dimension()
        
    def get_collection(self, config_key: str = "config_a"):
        """Returns the Chroma collection for the specified configuration."""
        name = self.COLLECTION_CONFIG_A if config_key in ("config_a", "a", self.COLLECTION_CONFIG_A) else self.COLLECTION_CONFIG_B
        # Using cosine distance metric in Chroma
        return self.client.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"}
        )
        
    def embed_texts(self, texts: List[str], batch_size: int = 64) -> List[List[float]]:
        """Encodes texts to normalized vector embeddings."""
        if not texts:
            return []
        embeddings = self.embed_model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=False,
            normalize_embeddings=True
        )
        return embeddings.tolist()
        
    def embed_query(self, query: str) -> List[float]:
        """Encodes a single query string into a normalized vector."""
        vec = self.embed_model.encode([query], normalize_embeddings=True)[0]
        return vec.tolist()
        
    def add_chunks(self, config_key: str, chunks: List[Dict[str, Any]], batch_size: int = 100):
        """
        Inserts chunks into the designated collection.
        Computes embeddings in batches.
        """
        if not chunks:
            return 0
            
        collection = self.get_collection(config_key)
        total = len(chunks)
        
        for i in range(0, total, batch_size):
            batch = chunks[i:i + batch_size]
            texts = [c["text"] for c in batch]
            ids = [f"{c['source_id']}_p{c['page_number']}_c{c['chunk_index']}_{config_key}" for c in batch]
            embeddings = self.embed_texts(texts)
            
            metadatas = []
            for c in batch:
                meta = {
                    "source_id": str(c.get("source_id", "unknown")),
                    "doc_name": str(c.get("doc_name", c.get("source_id", "unknown"))),
                    "page_number": int(c.get("page_number", 1)),
                    "total_pages": int(c.get("total_pages", 1)),
                    "chunk_index": int(c.get("chunk_index", 0)),
                    "char_count": int(c.get("char_length", len(c["text"]))),
                    "category": str(c.get("category", "Machine Learning")),
                    "config_tag": str(config_key)
                }
                metadatas.append(meta)
                
            collection.upsert(
                ids=ids,
                documents=texts,
                embeddings=embeddings,
                metadatas=metadatas
            )
            
        return total
        
    def query(
        self,
        query_text: str,
        config_key: str = "config_a",
        top_k: int = 5,
        metadata_filters: Optional[Dict[str, Any]] = None,
        score_threshold: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        Queries the vector store and returns ranked results with similarity scores,
        distances, metadata, and chunk context.
        """
        collection = self.get_collection(config_key)
        total_count = collection.count()
        if total_count == 0:
            return []
            
        k = min(top_k, total_count)
        query_vector = self.embed_query(query_text)
        
        # Prepare filter if provided
        where_filter = None
        if metadata_filters:
            valid_filters = {k: v for k, v in metadata_filters.items() if v is not None and v != "" and v != "All"}
            if len(valid_filters) == 1:
                where_filter = valid_filters
            elif len(valid_filters) > 1:
                where_filter = {"$and": [{k: v} for k, v in valid_filters.items()]}
                
        try:
            results = collection.query(
                query_embeddings=[query_vector],
                n_results=k,
                where=where_filter,
                include=["documents", "metadatas", "distances", "embeddings"]
            )
        except Exception as e:
            print(f"Query error with filter {where_filter}: {e}")
            # Fallback without where filter if syntax issue
            results = collection.query(
                query_embeddings=[query_vector],
                n_results=k,
                include=["documents", "metadatas", "distances", "embeddings"]
            )
            
        formatted_results = []
        if not results or not results.get("ids") or not results["ids"][0]:
            return []
            
        docs = results["documents"][0]
        metas = results["metadatas"][0]
        dists = results["distances"][0]
        emb_list = results.get("embeddings")
        embeddings = emb_list[0] if (emb_list and len(emb_list) > 0 and emb_list[0] is not None) else [None] * len(docs)
        
        for idx, (doc, meta, dist) in enumerate(zip(docs, metas, dists)):
            # In Chroma cosine distance: distance in [0, 2], cosine_sim = 1 - distance
            # For normalized vectors, similarity = max(0.0, 1.0 - distance)
            sim_score = max(0.0, 1.0 - float(dist))
            
            if sim_score < score_threshold:
                continue
                
            vec_sample = []
            if idx < len(embeddings) and embeddings[idx] is not None:
                raw_emb = embeddings[idx]
                if hasattr(raw_emb, "tolist"):
                    vec_sample = [round(float(v), 4) for v in raw_emb[:5].tolist()]
                else:
                    vec_sample = [round(float(v), 4) for v in raw_emb[:5]]
                
            formatted_results.append({
                "rank": idx + 1,
                "score": round(sim_score, 4),
                "similarity_pct": round(sim_score * 100, 2),
                "distance": round(float(dist), 4),
                "source_id": meta.get("source_id", "Unknown"),
                "doc_name": meta.get("doc_name", meta.get("source_id", "Unknown")),
                "page_number": meta.get("page_number", 1),
                "total_pages": meta.get("total_pages", 1),
                "chunk_index": meta.get("chunk_index", 0),
                "char_count": meta.get("char_count", len(doc)),
                "category": meta.get("category", "General"),
                "config_tag": meta.get("config_tag", config_key),
                "text": doc,
                "vector_sample": vec_sample
            })
            
        return formatted_results

    def get_collection_stats(self, config_key: str = "config_a") -> Dict[str, Any]:
        """Retrieves collection statistics: total chunks, unique documents, categories."""
        collection = self.get_collection(config_key)
        count = collection.count()
        if count == 0:
            return {
                "count": 0,
                "documents": [],
                "total_docs": 0,
                "avg_char_length": 0,
                "categories": []
            }
            
        all_data = collection.get(include=["metadatas"])
        metadatas = all_data.get("metadatas", [])
        
        doc_counts = {}
        categories = set()
        total_chars = 0
        
        for meta in metadatas:
            src = meta.get("source_id", "Unknown")
            doc_counts[src] = doc_counts.get(src, 0) + 1
            if "category" in meta and meta["category"]:
                categories.add(meta["category"])
            total_chars += meta.get("char_count", 0)
            
        return {
            "count": count,
            "documents": sorted(list(doc_counts.keys())),
            "doc_distribution": doc_counts,
            "total_docs": len(doc_counts),
            "avg_char_length": round(total_chars / count, 1) if count > 0 else 0,
            "categories": sorted(list(categories))
        }

    def get_all_vectors_for_visualization(self, config_key: str = "config_a", max_samples: int = 500) -> Dict[str, Any]:
        """Fetches embeddings and metadata for 2D dimensionality reduction (PCA/t-SNE)."""
        collection = self.get_collection(config_key)
        count = collection.count()
        if count == 0:
            return {"embeddings": np.array([]), "labels": [], "sources": [], "texts": []}
            
        limit = min(count, max_samples)
        data = collection.get(limit=limit, include=["embeddings", "metadatas", "documents"])
        
        embs = data.get("embeddings")
        if embs is None or len(embs) == 0:
            return {"embeddings": np.array([]), "labels": [], "sources": [], "texts": []}
            
        metadatas = data.get("metadatas", [])
        documents = data.get("documents", [])
        
        return {
            "embeddings": np.array(embs),
            "sources": [m.get("source_id", "Unknown") for m in metadatas] if metadatas else [],
            "categories": [m.get("category", "General") for m in metadatas] if metadatas else [],
            "pages": [m.get("page_number", 1) for m in metadatas] if metadatas else [],
            "chunk_indices": [m.get("chunk_index", 0) for m in metadatas] if metadatas else [],
            "texts": [d[:150] + "..." if len(d) > 150 else d for d in documents] if documents else []
        }
