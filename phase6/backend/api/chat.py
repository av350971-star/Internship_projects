import time
from fastapi import APIRouter, Depends
from models.response_models import ChatRequest, ChatResponse
from api.deps import (
    get_current_user_id,
    session_manager,
    memory_retriever,
    context_builder,
    llm_service,
    memory_extractor
)

router = APIRouter(prefix="/api/personalized", tags=["Chat"])


@router.post("/chat", response_model=ChatResponse)
async def personalized_chat(
    req: ChatRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Main personalized chat pipeline:
    1. Retrieve ephemeral session state
    2. Add user message to session
    3. Retrieve relevant long-term memories
    4. Apply relevance & confidence filter
    5. Build context strictly obeying context budget
    6. Invoke LLM service with memory-injected prompt
    7. Record assistant message in session state
    8. Post-turn memory decision (CREATE / UPDATE / IGNORE)
    9. Return answer with memory stats and audit summary (NO chain-of-thought leaked)
    """
    start_time = time.perf_counter()

    # 1. Ephemeral Session State
    session = session_manager.get_or_create_session(session_id=req.session_id, user_id=user_id)

    # 2. Add user message to session
    session_manager.add_message(
        session_id=session.session_id,
        user_id=user_id,
        role="user",
        content=req.message
    )

    # 3 & 4. Memory Retrieval & Scoring
    retrieval_results = memory_retriever.retrieve(
        query=req.message,
        user_id=user_id,
        session_id=session.session_id
    )

    # 5. Context Builder (Respects max memories & context budget)
    prompt, injected_summaries, stats, budget_used = context_builder.build_context(
        user_message=req.message,
        session_state=session,
        retrieval_results=retrieval_results,
        user_id=user_id
    )

    # 6. LLM Invocation
    answer = await llm_service.generate_response(
        prompt=prompt,
        user_message=req.message,
        injected_memories=injected_summaries
    )

    # 7. Add assistant message to session
    session_manager.add_message(
        session_id=session.session_id,
        user_id=user_id,
        role="assistant",
        content=answer,
        metadata={
            "injected_memory_ids": [m.memory_id for m in injected_summaries],
            "stats": stats.model_dump()
        }
    )

    # 8. Post-Turn Memory Decision (Extraction / Explicit Command / Deduplication)
    decision = memory_extractor.evaluate_and_extract(
        user_message=req.message,
        user_id=user_id,
        session_id=session.session_id
    )

    latency_ms = int((time.perf_counter() - start_time) * 1000)

    return ChatResponse(
        answer=answer,
        session_id=session.session_id,
        memory=stats,
        memory_context=injected_summaries,
        latency_ms=latency_ms,
        decision_summary=decision
    )
