from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import chat_router, memory_router, session_router, audit_router

app = FastAPI(
    title="Personalized Assistant with Controlled Memory",
    description="Backend demonstrating controlled memory retrieval, relevance filtering, context budgeting, and audit logging without leaking uncontrolled data.",
    version="1.0.0"
)

# Enable CORS for local Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers (audit_router registered before memory_router to avoid /{memory_id} collision)
app.include_router(chat_router)
app.include_router(audit_router)
app.include_router(memory_router)
app.include_router(session_router)


from fastapi import Depends
from models.response_models import ChatRequest, ChatResponse
from api.deps import get_current_user_id
from api.chat import personalized_chat

# Register direct /api/chat alias for compatibility
@app.post("/api/chat", response_model=ChatResponse, tags=["Chat"])
async def chat_direct(req: ChatRequest, user_id: str = Depends(get_current_user_id)):
    return await personalized_chat(req, user_id)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "personalized-assistant-controlled-memory",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
