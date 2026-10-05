"""
Main FastAPI entrypoint for Tool-Calling Operations Assistant.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from api.chat import router as chat_router
from api.tools import router as tools_router
from api.approvals import router as approvals_router
from api.executions import router as executions_router
from api.health import router as health_router
from api.database import router as database_router
from data.db_init import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ensure database and seed data are initialized on startup."""
    init_db()
    yield


app = FastAPI(
    title="Tool-Calling Operations Assistant",
    description="Secure internal tool calling engine with Pydantic validation, RBAC authorization, and approval workflows.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Exception Handlers to prevent exposing stack traces to clients
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        errors.append(f"{loc}: {err.get('msg')}")
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "type": "VALIDATION_ERROR",
                "message": "; ".join(errors),
                "details": exc.errors()
            }
        }
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Log internally, return sanitized JSON
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "type": "INTERNAL_SERVER_ERROR",
                "message": str(exc)
            }
        }
    )


# Mount routers
app.include_router(chat_router)
app.include_router(tools_router)
app.include_router(approvals_router)
app.include_router(executions_router)
app.include_router(health_router)
app.include_router(database_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
