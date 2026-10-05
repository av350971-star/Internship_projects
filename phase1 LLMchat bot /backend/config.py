import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Server Settings
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))

# LLM Provider Connection
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").strip().rstrip("/")
LLM_API_KEY = os.getenv("LLM_API_KEY", "").strip()

# Default Model & Temperature settings
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "gemini-3.8-flash").strip()
DEFAULT_TEMPERATURE = float(os.getenv("DEFAULT_TEMPERATURE", "0.7"))

# Default System Prompt
DEFAULT_SYSTEM_PROMPT = "You are an expert programming tutor for BCA students. Explain concepts step-by-step with clean code snippets and concise explanations."

# Pre-defined System Prompt Presets
SYSTEM_PROMPTS = [
    {
        "id": "coding_tutor",
        "name": "Coding Tutor (BCA/CS)",
        "prompt": "You are an expert programming tutor for BCA students. Explain concepts step-by-step with clean code snippets and concise explanations."
    },
    {
        "id": "general",
        "name": "General Assistant",
        "prompt": "You are a helpful, concise, and friendly AI assistant. Give direct, focused answers without unnecessary fluff."
    },
    {
        "id": "fact_checker",
        "name": "Strict Fact-Checker",
        "prompt": "You are a direct, objective fact-checker. Provide concise, verifiable answers and explicitly highlight any uncertainty."
    },
    {
        "id": "interview_prep",
        "name": "Technical Interviewer",
        "prompt": "You are a senior software engineering interviewer. Ask thoughtful follow-up questions and evaluate answers critically."
    }
]

# Supported Models with pricing per 1,000,000 tokens (for cost estimation)
# Pricing reference: standard public API pricing (USD)
# Supported Models strictly limited to the user-specified Gemini Flash models
MODELS_CATALOG = [
    {
        "id": "gemini-3.8-flash",
        "name": "gemini-3.8-flash (Default)",
        "provider": "Google Gemini",
        "prompt_cost_per_1m": 0.15,
        "completion_cost_per_1m": 0.60
    },
    {
        "id": "gemini-2.5-flash",
        "name": "gemini-2.5-flash",
        "provider": "Google Gemini",
        "prompt_cost_per_1m": 0.15,
        "completion_cost_per_1m": 0.60
    },
    {
        "id": "gemini-3.1-flash-lite",
        "name": "gemini-3.1-flash-lite",
        "provider": "Google Gemini",
        "prompt_cost_per_1m": 0.075,
        "completion_cost_per_1m": 0.30
    }
]

def calculate_cost(model_id: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Calculate estimated cost in USD based on model pricing per 1M tokens."""
    model_info = next((m for m in MODELS_CATALOG if m["id"] == model_id), None)
    if not model_info:
        # Fallback to standard mini model pricing if unknown
        model_info = MODELS_CATALOG[0]
    
    prompt_cost = (prompt_tokens / 1_000_000) * model_info["prompt_cost_per_1m"]
    completion_cost = (completion_tokens / 1_000_000) * model_info["completion_cost_per_1m"]
    return round(prompt_cost + completion_cost, 6)
