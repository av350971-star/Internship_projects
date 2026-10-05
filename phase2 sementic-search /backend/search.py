import os
import sys
import time
from typing import List, Dict, Any, Optional

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import CHUNK_CONFIGS
from backend.vector_store import get_collection
from backend.ingestion import get_embedding_model

def execute_search(
    query: str,
    config_key: str = "config_a",
    top_k: int = 5,
    source_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
    min_score: float = 0.0
) -> Dict[str, Any]:
    """
    Core Semantic Search / Retrieval Function:
    1. Embeds query into 384-dimensional dense vector using all-MiniLM-L6-v2.
    2. Executes cosine similarity search in ChromaDB.
    3. Converts cosine distance to similarity score:
         cosine_similarity = 1.0 - cosine_distance
    4. Applies optional metadata filters (source_id, category, min_score threshold).
       - If a metadata filter errors, raises ValueError (NO silent fallback!).
       - When min_score > 0, fetches enough candidate chunks so results are not prematurely truncated.
    5. Returns ranked retrieved chunks with vector embedding preview (384-dim, first 8 values).
    """
    start_time = time.time()
    
    if not query or not query.strip():
        return {
            "query": query,
            "config": config_key,
            "total_results": 0,
            "latency_ms": 0.0,
            "results": []
        }
        
    if config_key not in CHUNK_CONFIGS:
        config_key = "config_a"
        
    model = get_embedding_model()
    collection = get_collection(config_key)
    
    # 1. Generate query embedding
    query_vector = model.encode([query.strip()]).tolist()[0]
    
    # 2. Prepare ChromaDB metadata filter if requested
    where_clause = None
    conditions = []
    
    if source_filter and source_filter.strip() and source_filter != "all":
        conditions.append({"source_id": source_filter.strip()})
        
    if category_filter and category_filter.strip() and category_filter != "all":
        conditions.append({"category": category_filter.strip()})
        
    if len(conditions) == 1:
        where_clause = conditions[0]
    elif len(conditions) > 1:
        where_clause = {"$and": conditions}
        
    # When min_score is used, fetch enough candidates so filtering does not return too few results
    total_count = collection.count()
    if total_count == 0:
        return {
            "query": query,
            "config": config_key,
            "config_info": CHUNK_CONFIGS[config_key],
            "top_k": top_k,
            "total_results": 0,
            "latency_ms": 0.0,
            "results": []
        }
        
    if min_score > 0:
        fetch_k = min(total_count, max(top_k * 10, 50))
    else:
        fetch_k = min(total_count, top_k)
    
    # 3. Query ChromaDB (DO NOT silently fall back to unfiltered search on filter error!)
    try:
        raw_results = collection.query(
            query_embeddings=[query_vector],
            n_results=fetch_k,
            where=where_clause,
            include=["documents", "metadatas", "distances", "embeddings"]
        )
    except Exception as e:
        # Return clear error to caller instead of silent fallback
        raise ValueError(f"ChromaDB metadata filter error on {where_clause}: {str(e)}")

    # 4. Format and rank results
    retrieved_items = []
    
    docs = raw_results.get("documents", [[]])[0]
    metas = raw_results.get("metadatas", [[]])[0]
    distances = raw_results.get("distances", [[]])[0]
    ids = raw_results.get("ids", [[]])[0]
    raw_embs = raw_results.get("embeddings")
    embs = raw_embs[0] if (raw_embs is not None and len(raw_embs) > 0) else None
    
    for i in range(len(docs)):
        dist = float(distances[i]) if distances else 0.0
        # Cosine distance ranges from 0 (identical) to 2 (opposite).
        # Normal cosine similarity is 1 - distance.
        sim = max(0.0, min(1.0, 1.0 - dist))
        score_percent = round(sim * 100.0, 2)
        
        # Apply minimum similarity score threshold
        if score_percent < min_score:
            continue
            
        meta = metas[i] if metas and i < len(metas) else {}
        vec = embs[i] if (embs is not None and i < len(embs)) else []
        vector_dim = len(vec) if len(vec) > 0 else 384
        embedding_preview = [round(float(v), 4) for v in vec[:8]] if len(vec) > 0 else []
        
        retrieved_items.append({
            "rank": len(retrieved_items) + 1,
            "id": ids[i] if ids else f"result_{i}",
            "text": docs[i],
            "similarity_score": round(sim, 4),
            "similarity_percent": score_percent,
            "cosine_distance": round(dist, 4),
            "source_id": meta.get("source_id", "unknown"),
            "source_type": meta.get("source_type", "text"),
            "chunk_position": meta.get("chunk_position", f"Chunk {i+1}"),
            "chunk_index": meta.get("chunk_index", i + 1),
            "total_chunks": meta.get("total_chunks", 0),
            "page": meta.get("page", 1),
            "category": meta.get("category", "General"),
            "char_count": meta.get("char_count", len(docs[i])),
            "config": config_key,
            "vector_dim": vector_dim,
            "embedding_preview": embedding_preview
        })
        
        if len(retrieved_items) >= top_k:
            break
            
    latency_ms = round((time.time() - start_time) * 1000, 2)
    
    return {
        "query": query,
        "config": config_key,
        "config_info": CHUNK_CONFIGS[config_key],
        "top_k": top_k,
        "total_results": len(retrieved_items),
        "latency_ms": latency_ms,
        "results": retrieved_items
    }

def compare_configurations(
    query: str,
    top_k: int = 5,
    source_filter: Optional[str] = None,
    category_filter: Optional[str] = None
) -> Dict[str, Any]:
    """
    Run identical query across Config A (Small Chunks) and Config B (Large Chunks)
    for head-to-head inspection of retrieval performance and context depth.
    """
    res_a = execute_search(
        query=query,
        config_key="config_a",
        top_k=top_k,
        source_filter=source_filter,
        category_filter=category_filter
    )
    
    res_b = execute_search(
        query=query,
        config_key="config_b",
        top_k=top_k,
        source_filter=source_filter,
        category_filter=category_filter
    )
    
    # Compute aggregate statistics
    def calc_stats(results_dict):
        items = results_dict["results"]
        if not items:
            return {"top_score": 0.0, "avg_score": 0.0, "avg_length": 0, "count": 0}
        scores = [item["similarity_percent"] for item in items]
        lengths = [item["char_count"] for item in items]
        return {
            "top_score": max(scores),
            "avg_score": round(sum(scores) / len(scores), 2),
            "avg_length": round(sum(lengths) / len(lengths), 0),
            "count": len(items)
        }
        
    stats_a = calc_stats(res_a)
    stats_b = calc_stats(res_b)
    
    # Comparative insight for the student to explain
    observation = []
    if stats_a["top_score"] > stats_b["top_score"]:
        diff = round(stats_a["top_score"] - stats_b["top_score"], 2)
        observation.append(f"Config A achieved higher top precision by +{diff}% due to tighter semantic focus.")
    elif stats_b["top_score"] > stats_a["top_score"]:
        diff = round(stats_b["top_score"] - stats_a["top_score"], 2)
        observation.append(f"Config B achieved higher top score by +{diff}% due to richer contextual tokens.")
    else:
        observation.append("Both configurations produced identical top match similarity.")
        
    avg_len_diff = int(stats_b["avg_length"] - stats_a["avg_length"])
    observation.append(f"Config B chunks provide ~{avg_len_diff} more characters of surrounding context per result.")
    
    return {
        "query": query,
        "config_a": {
            **res_a,
            "stats": stats_a
        },
        "config_b": {
            **res_b,
            "stats": stats_b
        },
        "summary": {
            "observation": " ".join(observation),
            "faster_config": "Config A" if res_a["latency_ms"] <= res_b["latency_ms"] else "Config B",
            "latency_diff_ms": round(abs(res_a["latency_ms"] - res_b["latency_ms"]), 2)
        }
    }
