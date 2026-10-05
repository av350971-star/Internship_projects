import os
import sys
import time
import warnings
from typing import Dict, Any, List

# Suppress pypdf warnings
warnings.filterwarnings("ignore")

from pdf_reader import extract_pages, get_all_pdf_files
from text_cleaner import clean_text
from chunker import chunk_text
from vector_store import VectorStoreManager


DOCUMENT_CATEGORIES = {
    "9.AI_MLcoursenotes-ModelEvaluationandMetrics.pdf": "Model Evaluation & Metrics",
    "Artificial_Intelligence_Methods_in_Natural_Languag.pdf": "Natural Language Processing",
    "Attention Mechanism.pdf": "Transformers & Attention",
    "CNN.pdf": "Computer Vision & CNN",
    "Computer Vision.pdf": "Computer Vision",
    "Decision_Trees.pdf": "Supervised Learning",
    "Deep+Learning+Ian+Goodfellow.pdf": "Deep Learning Theory",
    "Foundations_of_Machine_Learning.pdf": "Machine Learning Foundations",
    "Neural Networks and Deep Learning-eng.pdf": "Neural Networks",
    "RNN.pdf": "Recurrent Architectures",
    "Supervised.pdf": "Supervised Learning",
    "Support_Vector_Machines_Theory_and_Applications.pdf": "Support Vector Machines",
    "Transformers.pdf": "Transformers & Attention",
    "Unsupervised_Learning Final.pdf": "Unsupervised Learning",
    "_knn_notes.pdf": "K-Nearest Neighbors",
    "classification.pdf": "Classification",
    "clustering.pdf": "Clustering & Unsupervised",
    "linearregression.pdf": "Linear Models",
    "randomforest.pdf": "Ensemble Methods",
    "regularization adn overfitting.pdf": "Regularization & Overfitting"
}


def infer_category(filename: str) -> str:
    """Infers category from filename or predefined map."""
    base = os.path.basename(filename)
    if base in DOCUMENT_CATEGORIES:
        return DOCUMENT_CATEGORIES[base]
    name_lower = base.lower()
    if "transformer" in name_lower or "attention" in name_lower:
        return "Transformers & Attention"
    elif "cnn" in name_lower or "vision" in name_lower:
        return "Computer Vision"
    elif "rnn" in name_lower or "nlp" in name_lower or "language" in name_lower:
        return "Natural Language Processing"
    elif "tree" in name_lower or "forest" in name_lower:
        return "Ensemble & Trees"
    elif "cluster" in name_lower or "unsupervised" in name_lower:
        return "Unsupervised Learning"
    elif "metric" in name_lower or "eval" in name_lower:
        return "Model Evaluation"
    else:
        return "Machine Learning"


def process_document(
    pdf_path: str,
    max_pages_per_doc: int = 15
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Reads a single PDF, cleans its text, and creates chunks for both
    Config A (small fixed) and Config B (sentence-aware large).
    """
    doc_id = os.path.basename(pdf_path)
    category = infer_category(doc_id)
    
    config_a_chunks = []
    config_b_chunks = []
    
    pages = list(extract_pages(pdf_path, max_pages=max_pages_per_doc))
    if not pages:
        return {"config_a": [], "config_b": []}
        
    total_pages = pages[0].get("total_pages", len(pages))
    
    for page in pages:
        p_num = page["page_number"]
        cleaned = clean_text(page["text"])
        if not cleaned or len(cleaned) < 40:  # Skip blank / trivial pages
            continue
            
        # Config A chunks (Fixed small ~400 chars)
        chunks_a = chunk_text(cleaned, config_name="config_a", chunk_size=400, overlap=50)
        for c in chunks_a:
            c.update({
                "source_id": doc_id,
                "doc_name": doc_id.replace(".pdf", "").replace("_", " ").replace("+", " "),
                "page_number": p_num,
                "total_pages": total_pages,
                "category": category
            })
            config_a_chunks.append(c)
            
        # Config B chunks (Sentence-aware large ~1000 chars)
        chunks_b = chunk_text(cleaned, config_name="config_b", chunk_size=1000, overlap=200)
        for c in chunks_b:
            c.update({
                "source_id": doc_id,
                "doc_name": doc_id.replace(".pdf", "").replace("_", " ").replace("+", " "),
                "page_number": p_num,
                "total_pages": total_pages,
                "category": category
            })
            config_b_chunks.append(c)
            
    # Assign sequential chunk indices per document
    for idx, c in enumerate(config_a_chunks):
        c["chunk_index"] = idx
    for idx, c in enumerate(config_b_chunks):
        c["chunk_index"] = idx
        
    return {
        "config_a": config_a_chunks,
        "config_b": config_b_chunks
    }


def ingest_corpus(
    documents_dir: str = "data/Documents",
    max_pages_per_doc: int = 15,
    progress_callback = None
) -> Dict[str, Any]:
    """
    Ingests all PDF documents from documents_dir into ChromaDB for both configs.
    """
    start_time = time.time()
    pdf_files = get_all_pdf_files(documents_dir)
    
    if not pdf_files:
        print(f"No PDF files found in {documents_dir}", flush=True)
        return {"status": "error", "message": "No documents found"}
        
    vsm = VectorStoreManager()
    
    total_docs = len(pdf_files)
    total_chunks_a = 0
    total_chunks_b = 0
    doc_summary = []
    
    print(f"Starting ingestion of {total_docs} PDF documents...", flush=True)
    
    for i, pdf_path in enumerate(pdf_files):
        doc_name = os.path.basename(pdf_path)
        t_doc = time.time()
        
        doc_chunks = process_document(pdf_path, max_pages_per_doc=max_pages_per_doc)
        ca = doc_chunks["config_a"]
        cb = doc_chunks["config_b"]
        
        if ca:
            vsm.add_chunks("config_a", ca)
            total_chunks_a += len(ca)
        if cb:
            vsm.add_chunks("config_b", cb)
            total_chunks_b += len(cb)
            
        doc_elapsed = round(time.time() - t_doc, 2)
        print(f"[{i+1}/{total_docs}] {doc_name} -> {len(ca)} (A) / {len(cb)} (B) chunks ({doc_elapsed}s)", flush=True)
        
        doc_summary.append({
            "filename": doc_name,
            "category": infer_category(doc_name),
            "chunks_config_a": len(ca),
            "chunks_config_b": len(cb)
        })
        
        if progress_callback:
            progress_callback(i + 1, total_docs, doc_name)
            
    elapsed = round(time.time() - start_time, 2)
    print(f"\n==========================================", flush=True)
    print(f"Ingestion Complete in {elapsed}s!", flush=True)
    print(f"Total Indexed Documents: {total_docs}", flush=True)
    print(f"Total Config A Chunks: {total_chunks_a}", flush=True)
    print(f"Total Config B Chunks: {total_chunks_b}", flush=True)
    print(f"==========================================", flush=True)
    
    return {
        "status": "success",
        "total_docs": total_docs,
        "total_chunks_a": total_chunks_a,
        "total_chunks_b": total_chunks_b,
        "elapsed_seconds": elapsed,
        "doc_summary": doc_summary
    }


if __name__ == "__main__":
    ingest_corpus()
