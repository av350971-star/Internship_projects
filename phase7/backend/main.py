"""
FastAPI entrypoint.
Run with: uvicorn main:app --reload --port 5001
CORS configured for 3000, 5173, and Vercel.
"""
import os
from app import app

if __name__ == "__main__":
    import uvicorn
    from config import settings

    # In production (Render/Railway), PORT is passed via environment variable
    port = int(os.getenv("PORT", settings.PORT))
    reload = os.getenv("ENVIRONMENT", "development").lower() == "development"
    uvicorn.run("main:app", host=settings.HOST, port=port, reload=reload)
