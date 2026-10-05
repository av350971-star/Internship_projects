"""
System configuration and default settings for Context-Aware Support Assistant.
Centralized parameters for Vector RAG, Context Budget, Relevance Weights, and Roles.
"""

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
PROMPTS_DIR = BASE_DIR / "prompts"
DATA_DIR = BASE_DIR / "data"

# External OpenAI-compatible AI Service Configuration
AI_BASE_URL = os.getenv("AI_BASE_URL", "https://ai-service-by-nik6348.vercel.app/v1").rstrip("/")
AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "gemini-pro")

# Centralized Context Budget & Summarization Settings
DEFAULT_CONTEXT_BUDGET = 1200          # Maximum token budget allowed for total context
DEFAULT_SUMMARIZE_THRESHOLD = 4        # Conversation turn threshold triggering summarization
DEFAULT_MAX_RETRIEVED_DOCS = 3         # Top-K candidate documents to retrieve

# Real Relevance-Based History Selection Weights
HISTORY_RELEVANCE_WEIGHT = 0.75        # Weight for semantic cosine similarity
HISTORY_RECENCY_WEIGHT = 0.25          # Weight for turn recency

# Vector Database & Embedding Model
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# Supported User Roles
ROLE_CUSTOMER = "customer"
ROLE_SUPPORT_AGENT = "support_agent"
ALLOWED_ROLES = [ROLE_CUSTOMER, ROLE_SUPPORT_AGENT]

# Tokenizer initialization for accurate token counting
_tokenizer = None

def get_tokenizer():
    global _tokenizer
    if _tokenizer is None:
        try:
            from transformers import AutoTokenizer
            _tokenizer = AutoTokenizer.from_pretrained(f"sentence-transformers/{EMBEDDING_MODEL}")
        except Exception:
            try:
                from transformers import AutoTokenizer
                _tokenizer = AutoTokenizer.from_pretrained(EMBEDDING_MODEL)
            except Exception:
                _tokenizer = False
    return _tokenizer

def estimate_tokens(text: str) -> int:
    """
    Counts tokens accurately using the model tokenizer when available,
    or falls back to standard word/character estimation.
    """
    if not text:
        return 0
    tok = get_tokenizer()
    if tok:
        try:
            return len(tok.encode(text, add_special_tokens=False))
        except Exception:
            pass
    # Fallback approximation rule: ~4 chars per token for English text
    return max(1, len(text.strip()) // 4)
