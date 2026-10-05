"""
FastAPI Backend for Autonomous Research Agent
----------------------------------------------
Endpoints:
  POST /api/research       -> Initiates an asynchronous research job
  GET  /api/status/{job_id}-> Polls real-time state, logs, findings, and report
  GET  /api/health         -> Health check endpoint
"""

from fastapi import FastAPI, BackgroundTasks, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import uuid
from typing import Dict

from config import settings
from logger import logger
from models import ResearchRequest, ResearchResponse, StatusResponse, ResearchState
from agent import run_research, create_new_state

app = FastAPI(
    title="Autonomous Research Agent API",
    description="Multi-step bounded research agent with state tracking, budget limits, and self-check evaluation.",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for research jobs: {job_id: ResearchState}
JOBS: Dict[str, ResearchState] = {}


def execute_job_task(topic: str, state: ResearchState) -> None:
    """Worker task executed in background."""
    try:
        run_research(topic, state)
    except Exception as e:
        logger.error(f"Uncaught background error for topic '{topic}': {e}", exc_info=True)
        state.status = "failed"
        state.error = str(e)


@app.post(
    "/api/research",
    response_model=ResearchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start an autonomous research job"
)
async def start_research(request: ResearchRequest, background_tasks: BackgroundTasks):
    """
    Submits a research topic. Spawns an autonomous background research task
    and returns a job_id for tracking progress.
    """
    job_id = uuid.uuid4().hex[:8]
    state = create_new_state(request.topic)
    JOBS[job_id] = state

    # Launch agent in background task
    background_tasks.add_task(execute_job_task, request.topic, state)
    logger.info(f"Accepted research job '{job_id}' for topic: '{request.topic}'")

    return ResearchResponse(
        job_id=job_id,
        message="Research started successfully"
    )


@app.get(
    "/api/status/{job_id}",
    response_model=StatusResponse,
    summary="Get status and progress of a research job"
)
async def get_status(job_id: str):
    """
    Polls real-time progress for a research job, including current step,
    token/budget consumption, sourced findings, execution logs, and the final report.
    """
    state = JOBS.get(job_id)
    if not state:
        raise HTTPException(status_code=404, detail="Research job not found")

    return StatusResponse(
        job_id=job_id,
        status=state.status,
        steps_used=state.steps_used,
        max_steps=state.max_steps,
        tokens_used=state.tokens_used,
        token_budget=state.token_budget,
        estimated_cost_usd=state.estimated_cost_usd,
        findings=state.findings,
        logs=state.logs,
        report=state.report if state.status == "done" else "",
        error=state.error
    )


@app.get("/api/health", summary="API Health Check")
async def health():
    """Health check endpoint to ensure backend is operational."""
    return {"ok": True, "service": "Autonomous Research Agent API", "status": "online"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host=settings.HOST, port=settings.PORT, reload=False)
