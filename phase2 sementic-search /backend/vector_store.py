import os
import chromadb
from chromadb.config import Settings
from backend.config import CHROMA_DIR, CHUNK_CONFIGS

_client = None

def get_chroma_client():
    """
    Returns a singleton PersistentClient for ChromaDB.
    Ensures thread safety and reuses open database handles.
    """
    global _client
    if _client is None:
        os.makedirs(CHROMA_DIR, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=CHROMA_DIR,
            settings=Settings(anonymized_telemetry=False)
        )
    return _client

def get_collection(config_key: str):
    """
    Retrieve or create ChromaDB collection for a specific chunking configuration.
    """
    if config_key not in CHUNK_CONFIGS:
        raise ValueError(f"Invalid config_key: {config_key}. Must be 'config_a' or 'config_b'")
    
    client = get_chroma_client()
    collection_name = CHUNK_CONFIGS[config_key]["collection_name"]
    
    # Using cosine distance space for intuitive 0 to 1 similarity scores
    return client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )
