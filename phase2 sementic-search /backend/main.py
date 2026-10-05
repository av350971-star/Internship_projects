import os
import sys
import shutil
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import (
    CHUNK_CONFIGS,
    BENCHMARK_QUERIES,
    EMBEDDING_MODEL_NAME,
    DOCS_DIR,
    PDF_DIR
)
from backend.vector_store import get_collection
from backend.ingestion import ingest_all, ingest_single_file, load_all_raw_documents
from backend.search import execute_search, compare_configurations
from backend.benchmark import evaluate_handwritten_queries

app = FastAPI(
    title="Semantic Search Engine API",
    description="Inspection Layer & Retrieval without Generation for BCA AI/ML Project",
    version="1.0.0"
)

# Enable CORS for React frontend (Vite runs on localhost:5173 or 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class SearchRequest(BaseModel):
    query: str
    config_key: str = "config_a"
    top_k: int = 5
    source_filter: Optional[str] = None
    category_filter: Optional[str] = None
    min_score: float = 0.0

class CompareRequest(BaseModel):
    query: str
    top_k: int = 5
    source_filter: Optional[str] = None
    category_filter: Optional[str] = None

class IngestRequest(BaseModel):
    force_reindex: bool = False

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "semantic-search-backend"}

@app.get("/api/stats")
def get_stats():
    """
    Returns statistics about total documents, chunk counts in ChromaDB,
    and configurations.
    """
    col_a = get_collection("config_a")
    col_b = get_collection("config_b")
    
    count_a = col_a.count()
    count_b = col_b.count()
    
    # List all document files
    pdf_count = len([f for f in os.listdir(PDF_DIR) if f.endswith(".pdf")]) if os.path.exists(PDF_DIR) else 0
    txt_count = len([f for f in os.listdir(DOCS_DIR) if f.endswith(".txt") or f.endswith(".md")]) if os.path.exists(DOCS_DIR) else 0
    total_docs = pdf_count + txt_count
    
    return {
        "total_documents": total_docs,
        "pdf_documents": pdf_count,
        "text_documents": txt_count,
        "embedding_model": EMBEDDING_MODEL_NAME,
        "embedding_dimensions": 384,
        "configurations": {
            "config_a": {
                **CHUNK_CONFIGS["config_a"],
                "total_chunks_stored": count_a
            },
            "config_b": {
                **CHUNK_CONFIGS["config_b"],
                "total_chunks_stored": count_b
            }
        },
        "retrieval_mode": "Pure Retrieval (Without Generation / LLM Synthesis)"
    }

@app.get("/api/filters")
def get_filters():
    """
    Returns unique sources and categories across the ingested chunks
    so the user can apply metadata filters in the UI.
    """
    col = get_collection("config_a")
    data = col.get(include=["metadatas"])
    
    sources = set()
    categories = set()
    
    for m in data.get("metadatas", []):
        if m:
            if "source_id" in m and m["source_id"]:
                sources.add(m["source_id"])
            if "category" in m and m["category"]:
                categories.add(m["category"])
                
    return {
        "sources": sorted(list(sources)),
        "categories": sorted(list(categories))
    }

@app.post("/api/search")
def search_endpoint(req: SearchRequest):
    """
    Main Semantic Search retrieval endpoint.
    Returns ranked chunks with similarity scores, distances, metadata, and vector preview.
    If a filter errors, returns a clear 400 error (NO silent fallback!).
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty")
        
    try:
        return execute_search(
            query=req.query,
            config_key=req.config_key,
            top_k=req.top_k,
            source_filter=req.source_filter,
            category_filter=req.category_filter,
            min_score=req.min_score
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.post("/api/compare")
def compare_endpoint(req: CompareRequest):
    """
    Side-by-side comparison endpoint for Config A (Small Chunks) vs Config B (Large Chunks).
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty")
        
    return compare_configurations(
        query=req.query,
        top_k=req.top_k,
        source_filter=req.source_filter,
        category_filter=req.category_filter
    )

@app.get("/api/benchmark/queries")
def get_benchmark_queries():
    """
    Returns pre-defined hand-written benchmark query set.
    """
    return BENCHMARK_QUERIES

@app.get("/api/benchmark/run")
def run_benchmark():
    """
    Executes automated evaluation of all hand-written queries across
    Config A and Config B, providing statistical metrics and comparison.
    """
    return evaluate_handwritten_queries()

@app.post("/api/ingest")
def trigger_ingestion(req: IngestRequest):
    """
    Manually triggers re-indexing / ingestion of all documents into ChromaDB.
    """
    try:
        res = ingest_all(force_reindex=req.force_reindex)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...), category: Optional[str] = Form(None)):
    """
    Allows the user to upload a custom PDF or TXT document directly from the UI
    and automatically ingest it into BOTH ChromaDB collections.
    """
    # 1. Sanitize filename using os.path.basename
    filename = os.path.basename(file.filename)
    if not (filename.endswith(".pdf") or filename.endswith(".txt") or filename.endswith(".md")):
        raise HTTPException(status_code=400, detail="Only .pdf, .txt, and .md files are supported")
        
    dest_dir = PDF_DIR if filename.endswith(".pdf") else DOCS_DIR
    os.makedirs(dest_dir, exist_ok=True)
    file_path = os.path.join(dest_dir, filename)
    
    # 2. Save uploaded file to disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 3. Index new file into both Config A and Config B
    try:
        ingest_res = ingest_single_file(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to index file: {str(e)}")
    
    return {
        "message": f"Successfully uploaded and indexed {filename}",
        "filename": filename,
        "category": ingest_res.get("category", "Uncategorized"),
        "config_a_chunks": ingest_res.get("config_a_chunks", 0),
        "config_b_chunks": ingest_res.get("config_b_chunks", 0),
        "ingest_result": ingest_res
    }

@app.get("/api/chunks")
def inspect_chunks(
    config_key: str = "config_a",
    page: int = 1,
    limit: int = 20,
    source: Optional[str] = None
):
    """
    Enables direct inspection of stored vector records in ChromaDB
    for transparency and presentation demo.
    """
    col = get_collection(config_key)
    where_clause = {"source_id": source} if source and source != "all" else None
    
    data = col.get(
        where=where_clause,
        include=["documents", "metadatas", "embeddings"],
        limit=limit,
        offset=(page - 1) * limit
    )
    
    total = col.count()
    items = []
    
    ids = data.get("ids", [])
    docs = data.get("documents", [])
    metas = data.get("metadatas", [])
    raw_embs = data.get("embeddings")
    embs = raw_embs if (raw_embs is not None and len(raw_embs) > 0) else None
    
    for i in range(len(ids)):
        meta = metas[i] if i < len(metas) else {}
        vec = embs[i] if (embs is not None and i < len(embs)) else []
        vector_dim = len(vec) if len(vec) > 0 else 384
        embedding_preview = [round(float(v), 4) for v in vec[:8]] if len(vec) > 0 else []

        items.append({
            "id": ids[i],
            "text": docs[i] if i < len(docs) else "",
            "source_id": meta.get("source_id", "Unknown"),
            "chunk_position": meta.get("chunk_position", f"Chunk {i+1}"),
            "page": meta.get("page", 1),
            "category": meta.get("category", "General"),
            "char_count": meta.get("char_count", len(docs[i]) if i < len(docs) else 0),
            "vector_dim": vector_dim,
            "embedding_preview": embedding_preview
        })
        
    return {
        "config_key": config_key,
        "page": page,
        "limit": limit,
        "total_chunks": total,
        "chunks": items
    }
