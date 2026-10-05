import re
from typing import List, Dict, Any


def clean_sentence_splits(text: str) -> List[str]:
    """Splits text into sentences based on punctuation while preserving meaning."""
    # Split by period, exclamation, question mark followed by space or newline
    sentence_endings = re.compile(r'(?<=[.!?])\s+')
    sentences = sentence_endings.split(text)
    return [s.strip() for s in sentences if s.strip()]


def chunk_text_fixed(text: str, chunk_size: int = 400, overlap: int = 50) -> List[Dict[str, Any]]:
    """
    Configuration A: Fixed Character Chunking with Overlap.
    Creates fine-grained chunks suitable for precise factual matching.
    """
    if not text or not text.strip():
        return []
    
    chunks = []
    text = text.strip()
    text_length = len(text)
    
    if chunk_size <= overlap:
        step = max(1, chunk_size // 2)
    else:
        step = chunk_size - overlap
    
    start = 0
    chunk_index = 0
    
    while start < text_length:
        end = min(start + chunk_size, text_length)
        chunk_str = text[start:end].strip()
        
        if chunk_str:
            chunks.append({
                "chunk_index": chunk_index,
                "text": chunk_str,
                "start_char": start,
                "end_char": end,
                "char_length": len(chunk_str),
                "config": "Config A (Fixed Small - 400 chars)"
            })
            chunk_index += 1
            
        if end >= text_length:
            break
            
        start += step
        
    return chunks


def chunk_text_recursive(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[Dict[str, Any]]:
    """
    Configuration B: Contextual / Sentence-Aware Chunking with Overlap.
    Builds larger coherent chunks respecting sentence boundaries for broader conceptual context.
    """
    if not text or not text.strip():
        return []
        
    text = text.strip()
    sentences = clean_sentence_splits(text)
    
    if not sentences:
        return chunk_text_fixed(text, chunk_size=chunk_size, overlap=overlap)
    
    chunks = []
    current_chunk = []
    current_len = 0
    chunk_index = 0
    
    i = 0
    while i < len(sentences):
        sentence = sentences[i]
        sent_len = len(sentence)
        
        # If a single sentence exceeds chunk_size, chunk it using fixed chunker
        if sent_len > chunk_size:
            if current_chunk:
                merged_text = " ".join(current_chunk).strip()
                chunks.append({
                    "chunk_index": chunk_index,
                    "text": merged_text,
                    "start_char": 0,
                    "end_char": len(merged_text),
                    "char_length": len(merged_text),
                    "config": "Config B (Sentence-Aware Large - 1000 chars)"
                })
                chunk_index += 1
                current_chunk = []
                current_len = 0
            
            sub_chunks = chunk_text_fixed(sentence, chunk_size=chunk_size, overlap=overlap)
            for sc in sub_chunks:
                sc["chunk_index"] = chunk_index
                sc["config"] = "Config B (Sentence-Aware Large - 1000 chars)"
                chunks.append(sc)
                chunk_index += 1
            i += 1
            continue
            
        if current_len + sent_len + 1 <= chunk_size:
            current_chunk.append(sentence)
            current_len += sent_len + 1
            i += 1
        else:
            if current_chunk:
                merged_text = " ".join(current_chunk).strip()
                chunks.append({
                    "chunk_index": chunk_index,
                    "text": merged_text,
                    "start_char": 0,
                    "end_char": len(merged_text),
                    "char_length": len(merged_text),
                    "config": "Config B (Sentence-Aware Large - 1000 chars)"
                })
                chunk_index += 1
                
                # Overlap: keep trailing sentences that fit into overlap budget
                overlap_chunk = []
                overlap_len = 0
                for s in reversed(current_chunk):
                    if overlap_len + len(s) + 1 <= overlap:
                        overlap_chunk.insert(0, s)
                        overlap_len += len(s) + 1
                    else:
                        break
                current_chunk = overlap_chunk
                current_len = sum(len(s) + 1 for s in current_chunk)
            else:
                current_chunk.append(sentence)
                current_len += sent_len + 1
                i += 1
                
    if current_chunk:
        merged_text = " ".join(current_chunk).strip()
        chunks.append({
            "chunk_index": chunk_index,
            "text": merged_text,
            "start_char": 0,
            "end_char": len(merged_text),
            "char_length": len(merged_text),
            "config": "Config B (Sentence-Aware Large - 1000 chars)"
        })
        
    return chunks


# Unified chunker interface
def chunk_text(text: str, config_name: str = "config_a", chunk_size: int = None, overlap: int = None) -> List[Dict[str, Any]]:
    """
    Unified entry point for chunking text based on configuration.
    - config_a: Small fixed chunks (400 chars, 50 overlap)
    - config_b: Sentence-aware large chunks (1000 chars, 200 overlap)
    """
    if config_name == "config_a":
        size = chunk_size or 400
        ovlp = overlap if overlap is not None else 50
        return chunk_text_fixed(text, chunk_size=size, overlap=ovlp)
    else:
        size = chunk_size or 1000
        ovlp = overlap if overlap is not None else 200
        return chunk_text_recursive(text, chunk_size=size, overlap=ovlp)