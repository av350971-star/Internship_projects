import os
import sys

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import re
import glob
import io
import time
from typing import List, Dict, Any, Optional
import pymupdf  # PyMuPDF
from PIL import Image
import pytesseract
from sentence_transformers import SentenceTransformer

from backend.config import (
    DOCS_DIR,
    PDF_DIR,
    EMBEDDING_MODEL_NAME,
    CHUNK_CONFIGS,
    get_doc_category
)
from backend.vector_store import get_collection

# Singleton for embedding model to avoid reloading multiple times
_model: Optional[SentenceTransformer] = None

def get_embedding_model() -> SentenceTransformer:
    """
    Load SentenceTransformer model once and keep in memory.
    Uses 'all-MiniLM-L6-v2' (384-dimensional dense vectors).
    """
    global _model
    if _model is None:
        print(f"Loading embedding model: {EMBEDDING_MODEL_NAME}...")
        _model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        print("Embedding model loaded successfully.")
    return _model

def clean_text(text: str) -> str:
    """
    Normalize whitespaces and clean noisy line breaks.
    """
    if not text:
        return ""
    # Replace multiple spaces/tabs with single space
    text = re.sub(r"[ \t]+", " ", text)
    # Normalize multiple newlines
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Remove leading/trailing spaces around newlines
    text = re.sub(r" *\n *", "\n", text)
    return text.strip()

def extract_pdf_pages(pdf_path: str) -> List[Dict[str, Any]]:
    """
    Extract text page-by-page from a PDF using PyMuPDF.
    If direct extraction yields no text, falls back to OCR via pytesseract.
    """
    pages_data = []
    doc = pymupdf.open(pdf_path)
    
    for page_num, page in enumerate(doc):
        # 1. Fast direct text extraction
        text = page.get_text()
        text = clean_text(text)
        
        # 2. Fallback to OCR if direct text is empty (scanned PDF)
        if len(text) < 20:
            try:
                pix = page.get_pixmap(matrix=pymupdf.Matrix(2, 2))
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                ocr_text = pytesseract.image_to_string(img)
                ocr_text = clean_text(ocr_text)
                if len(ocr_text) > len(text):
                    text = ocr_text
            except Exception as e:
                print(f"OCR fallback warning for page {page_num+1}: {e}")
        
        if text:
            pages_data.append({
                "page": page_num + 1,
                "text": text,
                "source": os.path.basename(pdf_path),
                "source_type": "pdf"
            })
            
    doc.close()
    return pages_data

def extract_text_file(file_path: str) -> List[Dict[str, Any]]:
    """
    Read plain text document.
    """
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    cleaned = clean_text(content)
    if not cleaned:
        return []
    
    return [{
        "page": 1,
        "text": cleaned,
        "source": os.path.basename(file_path),
        "source_type": "text"
    }]

def chunk_text(text: str, chunk_size: int, overlap: int) -> List[str]:
    """
    Split text into chunks of approx `chunk_size` characters with `overlap`.
    Always cuts on clean word boundaries (never chops a word in half).
    """
    words = text.split()
    if not words:
        return []
        
    chunks = []
    current_words = []
    current_len = 0
    
    for word in words:
        # +1 accounts for the space between words
        word_len = len(word) + (1 if current_words else 0)
        
        if current_len + word_len > chunk_size and current_words:
            # Complete the current chunk
            chunk_str = " ".join(current_words)
            if len(chunk_str) >= 30:
                chunks.append(chunk_str)
                
            # Retain trailing words to provide overlap for the next chunk
            overlap_words = []
            overlap_len = 0
            for w in reversed(current_words):
                if overlap_len + len(w) + 1 <= overlap:
                    overlap_words.insert(0, w)
                    overlap_len += len(w) + 1
                else:
                    break
                    
            current_words = overlap_words + [word]
            current_len = sum(len(w) for w in current_words) + max(0, len(current_words) - 1)
        else:
            current_words.append(word)
            current_len += word_len
            
    if current_words:
        chunk_str = " ".join(current_words)
        if len(chunk_str) >= 30:
            chunks.append(chunk_str)
            
    return chunks

def load_single_document(file_path: str) -> Optional[Dict[str, Any]]:
    """
    Loads a single document file (PDF or TXT) and returns structured document info.
    Category is determined strictly per source file via get_doc_category.
    """
    clean_name = os.path.basename(file_path)
    is_pdf = clean_name.lower().endswith(".pdf")
    
    pages = extract_pdf_pages(file_path) if is_pdf else extract_text_file(file_path)
    if not pages:
        return None
        
    return {
        "source": clean_name,
        "source_type": "pdf" if is_pdf else "text",
        "category": get_doc_category(clean_name),
        "pages": pages
    }

def build_chunks_for_document(doc: Dict[str, Any], config_key: str) -> List[Dict[str, Any]]:
    """
    Splits all pages of a document into chunks.
    chunk_position is calculated PER DOCUMENT ('Chunk X of Total_Chunks').
    Each chunk preserves its original 'page' number as separate metadata.
    """
    cfg = CHUNK_CONFIGS[config_key]
    chunk_size = cfg["chunk_size"]
    overlap = cfg["overlap"]
    
    # 1. Extract chunks across all pages of this document
    raw_chunks = []
    for p in doc["pages"]:
        page_chunks = chunk_text(p["text"], chunk_size=chunk_size, overlap=overlap)
        for chunk_txt in page_chunks:
            raw_chunks.append({
                "text": chunk_txt,
                "page": p["page"]
            })
            
    total_chunks = len(raw_chunks)
    doc_chunks = []
    
    # 2. Attach document-level position and unique ID
    for idx, item in enumerate(raw_chunks):
        chunk_idx = idx + 1
        chunk_data = {
            # Unique ID per config, document, and chunk position
            "id": f"{config_key}_{doc['source']}_c{chunk_idx}",
            "text": item["text"],
            "source_id": doc["source"],
            "source_type": doc["source_type"],
            "page": item["page"],
            "category": doc["category"],
            "chunk_index": chunk_idx,
            "total_chunks": total_chunks,
            "chunk_position": f"Chunk {chunk_idx} of {total_chunks}",
            "char_count": len(item["text"]),
            "config_id": config_key
        }
        doc_chunks.append(chunk_data)
        
    return doc_chunks

def load_all_raw_documents() -> List[Dict[str, Any]]:
    """
    Discovers and parses all files in pdf/ and data/documents/.
    Returns a list of structured document dictionaries.
    """
    documents = []
    
    # 1. Parse PDFs from pdf/
    if os.path.exists(PDF_DIR):
        pdf_files = glob.glob(os.path.join(PDF_DIR, "*.pdf"))
        for p in sorted(pdf_files):
            print(f"Reading PDF: {os.path.basename(p)}...")
            doc = load_single_document(p)
            if doc:
                documents.append(doc)
                print(f"  -> Extracted {len(doc['pages'])} pages from {doc['source']}.")
                
    # 2. Parse Text Documents from data/documents/
    if os.path.exists(DOCS_DIR):
        txt_files = glob.glob(os.path.join(DOCS_DIR, "*.txt")) + glob.glob(os.path.join(DOCS_DIR, "*.md"))
        for t_file in sorted(txt_files):
            doc = load_single_document(t_file)
            if doc:
                documents.append(doc)
                
    print(f"Total documents loaded: {len(documents)}")
    return documents

def ingest_single_file(file_path: str) -> Dict[str, Any]:
    """
    Ingests or updates a single file into BOTH ChromaDB collections (Config A & Config B).
    Deletes any existing chunks for that source_id first, then indexes new ones.
    Returns chunk counts.
    """
    clean_name = os.path.basename(file_path)
    doc = load_single_document(file_path)
    if not doc:
        raise ValueError(f"Could not extract readable text from '{clean_name}'")
        
    model = get_embedding_model()
    result_counts = {}
    
    # Index into both configurations
    for config_key in ["config_a", "config_b"]:
        collection = get_collection(config_key)
        
        # Delete old chunks for this source_id if present
        existing = collection.get(where={"source_id": clean_name})
        if existing and existing.get("ids"):
            collection.delete(ids=existing["ids"])
            
        chunks = build_chunks_for_document(doc, config_key)
        
        if chunks:
            texts = [c["text"] for c in chunks]
            ids = [c["id"] for c in chunks]
            embeddings = model.encode(texts, batch_size=64, show_progress_bar=False).tolist()
            metadatas = [
                {
                    "source_id": c["source_id"],
                    "source_type": c["source_type"],
                    "page": c["page"],
                    "category": c["category"],
                    "chunk_index": c["chunk_index"],
                    "total_chunks": c["total_chunks"],
                    "chunk_position": c["chunk_position"],
                    "char_count": c["char_count"],
                    "config_id": c["config_id"]
                }
                for c in chunks
            ]
            collection.add(
                ids=ids,
                documents=texts,
                embeddings=embeddings,
                metadatas=metadatas
            )
            
        result_counts[config_key] = len(chunks)
        
    return {
        "source_id": clean_name,
        "category": doc["category"],
        "config_a_chunks": result_counts.get("config_a", 0),
        "config_b_chunks": result_counts.get("config_b", 0)
    }

def ingest_all(force_reindex: bool = False) -> Dict[str, Any]:
    """
    End-to-end ingestion pipeline:
    1. Loads all raw documents
    2. Chunks each document with Config A and Config B
    3. Computes vector embeddings with SentenceTransformer
    4. Persists chunks + vectors + metadata in ChromaDB
    """
    start_time = time.time()
    model = get_embedding_model()
    raw_docs = load_all_raw_documents()
    
    stats = {}
    
    for config_key, cfg in CHUNK_CONFIGS.items():
        collection = get_collection(config_key)
        existing_count = collection.count()
        
        if existing_count > 0 and not force_reindex:
            print(f"Collection '{cfg['collection_name']}' already has {existing_count} chunks. Skipping re-indexing.")
            stats[config_key] = {
                "chunks_count": existing_count,
                "status": "cached",
                "config_name": cfg["name"]
            }
            continue
            
        if force_reindex and existing_count > 0:
            print(f"Clearing existing {existing_count} chunks from '{cfg['collection_name']}'...")
            existing_ids = collection.get()["ids"]
            if existing_ids:
                collection.delete(ids=existing_ids)
                
        print(f"\nProcessing {cfg['name']} (Size={cfg['chunk_size']}, Overlap={cfg['overlap']})...")
        
        # Build chunks for all documents
        all_chunks = []
        for doc in raw_docs:
            doc_chunks = build_chunks_for_document(doc, config_key)
            all_chunks.extend(doc_chunks)
            
        print(f"Generated {len(all_chunks)} chunks for {config_key}.")
        
        # Compute embeddings in batches
        batch_size = 64
        texts = [c["text"] for c in all_chunks]
        print(f"Computing embeddings for {len(texts)} chunks...")
        embeddings = model.encode(texts, batch_size=batch_size, show_progress_bar=True).tolist()
        
        # Insert into ChromaDB in batches
        ids = [c["id"] for c in all_chunks]
        metadatas = [
            {
                "source_id": c["source_id"],
                "source_type": c["source_type"],
                "page": c["page"],
                "category": c["category"],
                "chunk_index": c["chunk_index"],
                "total_chunks": c["total_chunks"],
                "chunk_position": c["chunk_position"],
                "char_count": c["char_count"],
                "config_id": c["config_id"]
            }
            for c in all_chunks
        ]
        
        insert_batch_size = 500
        for i in range(0, len(all_chunks), insert_batch_size):
            end_idx = min(i + insert_batch_size, len(all_chunks))
            collection.add(
                ids=ids[i:end_idx],
                documents=texts[i:end_idx],
                embeddings=embeddings[i:end_idx],
                metadatas=metadatas[i:end_idx]
            )
            
        stats[config_key] = {
            "chunks_count": len(all_chunks),
            "status": "indexed",
            "config_name": cfg["name"]
        }
        print(f"Successfully stored {len(all_chunks)} chunks in '{cfg['collection_name']}'!")
        
    duration = round(time.time() - start_time, 2)
    return {
        "success": True,
        "duration_seconds": duration,
        "configs": stats,
        "total_documents": len(raw_docs)
    }

if __name__ == "__main__":
    print("Starting re-ingestion with word-boundary chunking & fixed categories...")
    result = ingest_all(force_reindex=True)
    print("Ingestion Result:", result)
