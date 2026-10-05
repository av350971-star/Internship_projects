import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory paths
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

# Load environment variables from .env file
load_dotenv(dotenv_path=ENV_PATH)

class Settings:
    # External AI API Configuration
    AI_BASE_URL: str = os.getenv("AI_BASE_URL", "https://ai-service-by-nik6348.vercel.app/v1").rstrip("/")
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    AI_MODEL: str = os.getenv("AI_MODEL", "gemini-pro")

    # Storage Paths
    DATA_DIR: Path = BASE_DIR / "data"
    SQLITE_DB_PATH: Path = BASE_DIR / os.getenv("SQLITE_DB_PATH", "data/cited_assistant.db")
    SAMPLE_DOCS_DIR: Path = BASE_DIR / "sample_documents"

    # Embedding Model
    EMBEDDING_MODEL_NAME: str = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")

    # Retrieval Thresholds & Tuning
    MIN_CONFIDENCE_THRESHOLD: float = float(os.getenv("MIN_CONFIDENCE_THRESHOLD", "0.35"))
    HYBRID_ALPHA: float = float(os.getenv("HYBRID_ALPHA", "0.5"))  # 0.0 = 100% BM25, 1.0 = 100% Dense
    MAX_RETRIEVAL_CHUNKS: int = int(os.getenv("MAX_RETRIEVAL_CHUNKS", "4"))
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "500"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "60"))

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    @classmethod
    def ensure_dirs(cls):
        """Ensure necessary storage directories exist."""
        cls.DATA_DIR.mkdir(parents=True, exist_ok=True)
        cls.SQLITE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        cls.SAMPLE_DOCS_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.ensure_dirs()
