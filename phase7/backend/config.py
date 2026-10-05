"""
Application Configuration using Pydantic Settings.
Loads settings from environment variables or .env file.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
from typing import Union
import os
from pathlib import Path

# Base directory for backend
BASE_DIR = Path(__file__).resolve().parent

class Settings(BaseSettings):
    # LLM Settings (OpenAI-compatible endpoint hosting Gemini)
    AI_BASE_URL: str = Field(default="https://ai-service-by-nik6348.vercel.app/v1/", description="AI API Base URL")
    AI_API_KEY: str = Field(default="", description="API Key for the AI service")
    AI_MODEL: str = Field(default="gemini-pro", description="Model identifier, e.g. gemini-pro")

    # Optional alias support
    API_KEY: str = Field(default="", description="Alias for AI_API_KEY")
    GEMINI_API_KEY: str = Field(default="", description="Alias for backward compatibility")
    GEMINI_MODEL: str = Field(default="", description="Alias for backward compatibility")

    def get_api_key(self) -> str:
        """Returns the configured API key from AI_API_KEY, API_KEY, or GEMINI_API_KEY."""
        return (self.AI_API_KEY or self.API_KEY or self.GEMINI_API_KEY or "").strip()

    def get_model(self) -> str:
        """Returns the configured model name."""
        return (self.AI_MODEL or self.GEMINI_MODEL or "gemini-pro").strip()


    # Agent Budget & Bounded Execution Constraints
    MAX_STEPS: int = Field(default=8, description="Maximum total agent steps allowed")
    MAX_SEARCH_CALLS: int = Field(default=4, description="Maximum web search queries allowed")
    MAX_PAGES_TO_READ: int = Field(default=6, description="Maximum web pages to read")
    TOKEN_BUDGET: int = Field(default=12000, description="Total token budget limit")
    COST_PER_1K_TOKENS: float = Field(default=0.00015, description="Estimated USD cost per 1k tokens")
    NO_PROGRESS_LIMIT: int = Field(default=2, description="Consecutive steps with no new findings before early stop")
    EVALUATOR_EXTRA_PASS: int = Field(default=1, description="Max extra retrieval passes allowed for evaluator")

    # Server Settings
    HOST: str = Field(default="0.0.0.0", description="FastAPI host (0.0.0.0 for cloud/docker)")
    PORT: int = Field(default=5001, description="FastAPI port")
    CORS_ORIGINS: Union[list[str], str] = Field(
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://researchagent-phi.vercel.app",
        ],
        description="Allowed CORS origins"
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return [x.strip().rstrip("/") for x in json.loads(v) if x.strip()]
                except Exception:
                    pass
            return [x.strip().rstrip("/") for x in v.split(",") if x.strip()]
        if isinstance(v, list):
            return [x.strip().rstrip("/") for x in v if isinstance(x, str) and x.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
