import os
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.config import settings
from backend.storage.sqlite_store import store
from backend.services.ingestion import ingestion_service
from backend.services.embeddings import embedding_service
from backend.services.bm25_retriever import bm25_retriever
from backend.services.hybrid_search import hybrid_search_service
from backend.services.reranker import reranker_service
from backend.services.llm_service import llm_service
from backend.services.evaluation_dataset import EVALUATION_QUESTIONS

def auto_seed_sample_documents():
    """Seeds the database with sample documents on initial boot if empty."""
    existing_docs = store.get_documents()
    if existing_docs:
        print(f"[Seed] Database already contains {len(existing_docs)} documents.")
        return

    print("[Seed] Seeding sample documents from sample_documents/ directory...")
    sample_dir = settings.SAMPLE_DOCS_DIR

    tenant_dirs = [
        ("tenant_engineering", sample_dir / "tenant_engineering"),
        ("tenant_hr", sample_dir / "tenant_hr")
    ]

    for tenant_id, path in tenant_dirs:
        if not path.exists():
            continue
        for file_path in path.iterdir():
            if file_path.is_file() and not file_path.name.startswith("."):
                try:
                    with open(file_path, "rb") as f:
                        file_bytes = f.read()
                    res = ingestion_service.process_and_ingest(
                        file_bytes=file_bytes,
                        filename=file_path.name,
                        tenant_id=tenant_id,
                        project_id="default",
                        force_reindex=False,
                        embedding_service=embedding_service
                    )
                    print(f"  [Seeded] {tenant_id}: {file_path.name} ({res['chunk_count']} chunks)")
                except Exception as e:
                    print(f"  [Seed Error] {file_path.name}: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize storage tables and seed documents
    store.init_db()
    auto_seed_sample_documents()
    yield

app = FastAPI(
    title="Cited Knowledge Assistant API",
    description="Enterprise document assistant with hybrid retrieval, inline citations, and decline on weak evidence.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic Request & Response Schemas ──

class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, description="User question")
    tenant_id: str = Field(..., description="Tenant ID to query")
    project_id: Optional[str] = Field(None, description="Optional project sub-filter")
    search_mode: str = Field("hybrid", description="Retrieval mode: 'hybrid', 'dense', or 'sparse'")
    alpha: float = Field(0.5, ge=0.0, le=1.0, description="Weight: 1.0=Dense, 0.0=Sparse")
    threshold: Optional[float] = Field(None, ge=0.0, le=1.0, description="Evidence threshold override")

class CompareRequest(BaseModel):
    query: str = Field(..., min_length=1)
    tenant_id: str = Field(...)
    top_k: int = Field(5, ge=1, le=20)

class EvaluationRunRequest(BaseModel):
    question_id: Optional[int] = Field(None, description="Optional question ID to evaluate individually (1-25)")

# ── API Endpoints ──

@app.get("/api/health")
def health_check():
    docs = store.get_documents()
    tenants = store.get_all_tenants()
    return {
        "status": "online",
        "model": settings.AI_MODEL,
        "embedding_model": settings.EMBEDDING_MODEL_NAME,
        "total_documents": len(docs),
        "tenants": tenants,
        "threshold": settings.MIN_CONFIDENCE_THRESHOLD
    }

@app.get("/api/tenants")
def get_tenants():
    """Returns list of distinct tenants."""
    return {"tenants": store.get_all_tenants()}

@app.get("/api/documents")
def list_documents(tenant_id: Optional[str] = Query(None)):
    """Lists documents filtered by tenant."""
    docs = store.get_documents(tenant_id=tenant_id)
    return {"documents": docs}

@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    tenant_id: str = Form(...),
    project_id: str = Form("default"),
    force_reindex: bool = Form(False)
):
    """Uploads, parses, chunks, embeds, and indexes a multi-format document."""
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        result = ingestion_service.process_and_ingest(
            file_bytes=content,
            filename=file.filename,
            tenant_id=tenant_id,
            project_id=project_id,
            force_reindex=force_reindex,
            embedding_service=embedding_service
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/documents/reindex/{doc_id}")
def reindex_document(doc_id: str):
    """
    Re-indexes an existing document.
    If the original source file exists on disk, it fully re-parses, re-chunks,
    and updates embeddings. Otherwise, it re-encodes existing chunk embeddings.
    """
    doc = store.get_document_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    tenant_id = doc["tenant_id"]
    filename = doc["filename"]

    # Check if raw file is stored in uploaded_files or sample_documents
    saved_upload = settings.DATA_DIR / "uploaded_files" / tenant_id / f"{doc_id}_{filename}"
    sample_file = settings.SAMPLE_DOCS_DIR / tenant_id / filename

    source_path = None
    if saved_upload.exists():
        source_path = saved_upload
    elif sample_file.exists():
        source_path = sample_file

    if source_path and source_path.exists():
        with open(source_path, "rb") as f:
            file_bytes = f.read()
        res = ingestion_service.process_and_ingest(
            file_bytes=file_bytes,
            filename=filename,
            tenant_id=tenant_id,
            project_id=doc.get("project_id", "default"),
            force_reindex=True,
            embedding_service=embedding_service
        )
        return {
            "status": "reindexed",
            "mode": "full_reparse",
            "doc_id": doc_id,
            "filename": filename,
            "chunk_count": res["chunk_count"]
        }

    # Fallback: re-encode existing chunks
    chunks = store.get_chunks_by_tenant(tenant_id)
    doc_chunks = [c for c in chunks if c["doc_id"] == doc_id]

    if not doc_chunks:
        raise HTTPException(status_code=400, detail="No chunks found to re-index.")

    texts = [c["text_content"] for c in doc_chunks]
    embeddings = embedding_service.encode_batch(texts)
    for i, emb in enumerate(embeddings):
        doc_chunks[i]["embedding"] = emb

    store.save_chunks(doc_chunks)
    return {
        "status": "reindexed",
        "mode": "re_embed",
        "doc_id": doc_id,
        "filename": filename,
        "chunk_count": len(doc_chunks)
    }

@app.post("/api/documents/reindex-all")
def reindex_all_documents(tenant_id: Optional[str] = Query(None)):
    """Re-indexes all documents for a tenant (or across all tenants)."""
    docs = store.get_documents(tenant_id=tenant_id)
    reindexed_count = 0
    total_chunks = 0
    for d in docs:
        try:
            res = reindex_document(d["id"])
            reindexed_count += 1
            total_chunks += res.get("chunk_count", 0)
        except Exception as e:
            print(f"Error reindexing doc {d['id']}: {e}")
    return {
        "status": "completed",
        "documents_reindexed": reindexed_count,
        "total_chunks": total_chunks,
        "tenant_id": tenant_id or "all"
    }

@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str):
    """Deletes a document and all associated chunks."""
    doc = store.get_document_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Remove stored raw file if exists
    tenant_id = doc.get("tenant_id", "")
    filename = doc.get("filename", "")
    saved_upload = settings.DATA_DIR / "uploaded_files" / tenant_id / f"{doc_id}_{filename}"
    if saved_upload.exists():
        try:
            saved_upload.unlink()
        except Exception:
            pass

    deleted = store.delete_document(doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"status": "deleted", "doc_id": doc_id}

@app.post("/api/chat")
async def chat_with_assistant(req: ChatRequest):
    """
    Main Question-Answering endpoint:
    1. Tenant-isolated retrieval (dense/sparse/hybrid)
    2. Retrieval refinement and reranking
    3. Evidence decision gate (decline if weak)
    4. Grounded answer generation with in-line source citations
    """
    start_time = time.time()
    query = req.query.strip()
    tenant_id = req.tenant_id.strip()

    # Step 1: Retrieval
    candidate_chunks = hybrid_search_service.retrieve(
        query=query,
        tenant_id=tenant_id,
        search_mode=req.search_mode,
        alpha=req.alpha,
        top_k=settings.MAX_RETRIEVAL_CHUNKS * 2
    )

    # Step 2: Refinement & Reranking
    refined_chunks = reranker_service.refine_and_rerank(
        query=query,
        retrieved_chunks=candidate_chunks,
        top_k=settings.MAX_RETRIEVAL_CHUNKS
    )

    # Step 3: Evidence Decision Gate
    threshold = req.threshold if req.threshold is not None else settings.MIN_CONFIDENCE_THRESHOLD
    is_weak, decline_reason, highest_score = reranker_service.evaluate_evidence(
        query=query,
        refined_chunks=refined_chunks,
        threshold=threshold
    )

    total_latency_ms = int((time.time() - start_time) * 1000)

    # If evidence is weak, decline deterministically without LLM hallucination
    if is_weak:
        return {
            "answer": (
                "I am unable to answer based on the provided documents because the available evidence is insufficient.\n\n"
                f"**Evidence Gate Details**: Highest match score ({highest_score:.3f}) was below the confidence threshold ({threshold:.2f})."
            ),
            "is_declined": True,
            "decline_reason": decline_reason,
            "citations": [],
            "retrieved_chunks": refined_chunks,
            "highest_score": highest_score,
            "threshold": threshold,
            "tenant_id": tenant_id,
            "search_mode": req.search_mode,
            "latency_ms": total_latency_ms
        }

    # Step 4: Grounded LLM Generation with Citations
    llm_result = await llm_service.generate_cited_answer(query, refined_chunks)
    total_latency_ms = int((time.time() - start_time) * 1000)

    return {
        "answer": llm_result["answer"],
        "is_declined": llm_result["is_declined"],
        "decline_reason": llm_result.get("decline_reason"),
        "citations": llm_result["citations"],
        "retrieved_chunks": refined_chunks,
        "highest_score": highest_score,
        "threshold": threshold,
        "tenant_id": tenant_id,
        "search_mode": req.search_mode,
        "latency_ms": total_latency_ms,
        "tokens": llm_result.get("tokens", {})
    }

@app.post("/api/search/compare")
def compare_search(req: CompareRequest):
    """Side-by-side retrieval comparison: Dense vs Sparse (BM25) vs Hybrid."""
    results = hybrid_search_service.compare_search_modes(
        query=req.query,
        tenant_id=req.tenant_id,
        top_k=req.top_k
    )
    return results

@app.get("/api/evaluation/questions")
def get_evaluation_questions():
    """Returns the 25-question evaluation suite."""
    return {"questions": EVALUATION_QUESTIONS}

@app.post("/api/evaluation/run")
async def run_evaluation(req: EvaluationRunRequest):
    """
    Runs the 25-question evaluation suite (or a single selected test).
    Evaluates:
    - Decline accuracy (does it decline when it should?)
    - Answer accuracy & citations (does it cite when answering?)
    - Tenant isolation (does cross-tenant query return 0 chunks / decline?)
    """
    questions_to_run = EVALUATION_QUESTIONS
    if req.question_id is not None:
        questions_to_run = [q for q in EVALUATION_QUESTIONS if q["id"] == req.question_id]
        if not questions_to_run:
            raise HTTPException(status_code=404, detail="Question ID not found.")

    results = []
    passed_count = 0

    for q in questions_to_run:
        q_id = q["id"]
        q_text = q["question"]
        tenant = q["tenant_id"]
        expected = q["expected_behavior"]  # "answer" or "decline"
        expected_keywords = q["expected_keywords"]

        chat_req = ChatRequest(
            query=q_text,
            tenant_id=tenant,
            search_mode="hybrid",
            alpha=0.5
        )

        res = await chat_with_assistant(chat_req)

        is_declined = res["is_declined"]
        answer_text = res["answer"]
        citations = res["citations"]
        highest_score = res["highest_score"]
        latency = res["latency_ms"]

        # Evaluation verification logic
        test_passed = False
        failure_reason = ""

        if expected == "decline":
            # For decline queries: system must either trigger weak evidence gate or LLM decline
            if is_declined:
                test_passed = True
            else:
                # Check if text contains decline language
                decline_terms = ["insufficient", "unable to answer", "not contain", "cannot answer"]
                if any(t in answer_text.lower() for t in decline_terms):
                    test_passed = True
                else:
                    failure_reason = "Expected system to decline, but an answer was generated."
        else:
            # For answer queries: must not decline, must contain citations or expected keywords
            if is_declined:
                failure_reason = f"Expected answer, but system declined (score: {highest_score:.3f})."
            else:
                # Check keyword match
                has_keywords = any(kw.lower() in answer_text.lower() for kw in expected_keywords)
                has_citations = len(citations) > 0 or "[" in answer_text

                if has_keywords and has_citations:
                    test_passed = True
                elif not has_keywords:
                    failure_reason = f"Answer missing expected keywords: {expected_keywords}"
                elif not has_citations:
                    failure_reason = "Answer generated without required in-line citations [1]."
                else:
                    test_passed = True

        if test_passed:
            passed_count += 1

        results.append({
            "id": q_id,
            "category": q["category"],
            "question": q_text,
            "tenant_id": tenant,
            "expected_behavior": expected,
            "actual_declined": is_declined,
            "passed": test_passed,
            "failure_reason": failure_reason,
            "answer": answer_text,
            "citations_count": len(citations),
            "citations": citations,
            "highest_score": highest_score,
            "latency_ms": latency
        })

    total = len(questions_to_run)
    pass_rate = round((passed_count / total) * 100, 1) if total > 0 else 0.0

    return {
        "total_evaluated": total,
        "passed": passed_count,
        "failed": total - passed_count,
        "pass_rate_percent": pass_rate,
        "results": results
    }

@app.get("/api/evaluation/export")
def export_evaluation_report():
    """Generates and returns an exportable Markdown report of the evaluation benchmark."""
    report_file = settings.DATA_DIR / "evaluation_results.json"
    data = None
    if report_file.exists():
        try:
            with open(report_file, "r") as f:
                data = json.load(f)
        except Exception:
            pass

    md_lines = [
        "# 📊 Cited Knowledge Assistant — 25-Question Evaluation Report",
        "",
        f"**Date Generated:** {time.strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"**Model:** {settings.AI_MODEL} | **Embedding:** {settings.EMBEDDING_MODEL_NAME}",
        ""
    ]

    if data:
        md_lines.extend([
            f"### 🎯 Overall Benchmark: {data.get('passed', 0)}/{data.get('total', 25)} Passed ({data.get('pass_rate_percent', 0)}% Success Rate)",
            "",
            "| ID | Category | Tenant | Question | Expected | Actual | Score | Status |",
            "|---|---|---|---|---|---|---|---|"
        ])
        for r in data.get("results", []):
            st = "✅ PASS" if r.get("passed") else "❌ FAIL"
            act = "DECLINED" if r.get("actual_declined") else f"ANSWERED ({r.get('citations_count', 0)} citations)"
            md_lines.append(f"| {r.get('id')} | {r.get('category')} | {r.get('tenant_id')} | {r.get('question')} | {r.get('expected', '').upper()} | {act} | {r.get('highest_score', 0):.3f} | {st} |")
    else:
        md_lines.extend([
            "### Evaluation Suite Dataset (25 Questions)",
            "",
            "| ID | Category | Tenant | Question | Expected Behavior | Target Document |",
            "|---|---|---|---|---|---|"
        ])
        for q in EVALUATION_QUESTIONS:
            md_lines.append(f"| {q['id']} | {q['category']} | {q['tenant_id']} | {q['question']} | {q['expected_behavior'].upper()} | {q.get('target_document', '')} |")

    return {
        "report_markdown": "\n".join(md_lines),
        "data": data
    }

