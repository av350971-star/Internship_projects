import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory or root
env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

MEMORY_DB_PATH = DATA_DIR / "memory.db"
SESSION_DB_PATH = DATA_DIR / "sessions.db"

BASE_URL = os.getenv("BASE_URL", "").strip() or None
API_KEY = os.getenv("API_KEY", "").strip() or None
MODEL = os.getenv("MODEL", "gpt-4o-mini").strip()
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.2"))

MEMORY_RELEVANCE_THRESHOLD = float(os.getenv("MEMORY_RELEVANCE_THRESHOLD", "0.60"))
MEMORY_CONFIDENCE_THRESHOLD = float(os.getenv("MEMORY_CONFIDENCE_THRESHOLD", "0.70"))
MAX_MEMORIES_IN_CONTEXT = int(os.getenv("MAX_MEMORIES_IN_CONTEXT", "5"))
MEMORY_CONTEXT_BUDGET = int(os.getenv("MEMORY_CONTEXT_BUDGET", "1200"))

DEFAULT_USER_ID = "USER-1001"
