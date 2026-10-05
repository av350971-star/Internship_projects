import os
from typing import Generator, Dict, Any, List
# pyrefly: ignore [missing-import]
from pypdf import PdfReader


def extract_pages(pdf_path: str, max_pages: int = None) -> Generator[Dict[str, Any], None, None]:
    """
    Extracts text page-by-page from a given PDF file path.
    Yields a dictionary with page_number, raw text, and metadata.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found at: {pdf_path}")
        
    doc_id = os.path.basename(pdf_path)
    
    try:
        reader = PdfReader(pdf_path)
        total_pages = len(reader.pages)
        pages_to_process = min(total_pages, max_pages) if max_pages else total_pages

        for page_idx in range(pages_to_process):
            try:
                page = reader.pages[page_idx]
                text = page.extract_text() or ""
                
                if text.strip():
                    yield {
                        "doc_id": doc_id,
                        "pdf_path": pdf_path,
                        "page_number": page_idx + 1,
                        "total_pages": total_pages,
                        "text": text
                    }
            except Exception as e:
                print(f"Warning: Failed to extract page {page_idx+1} from {doc_id}: {e}")
                continue
    except Exception as e:
        print(f"Error reading PDF {doc_id}: {e}")


def get_all_pdf_files(directory: str) -> List[str]:
    """Returns sorted list of all PDF file paths in a directory."""
    if not os.path.exists(directory):
        return []
        
    pdf_files = []
    for root, _, files in os.walk(directory):
        for f in files:
            if f.lower().endswith(".pdf") and not f.startswith("."):
                pdf_files.append(os.path.join(root, f))
                
    return sorted(pdf_files)