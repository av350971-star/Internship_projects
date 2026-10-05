from models.memory_models import MemoryCreate
from services.context_builder import ContextBuilder


def test_context_builder_separation_and_budget(
    memory_manager,
    memory_retriever,
    session_manager,
    audit_service
):
    user_id = "USER-CONTEXT"

    # Create 3 memories
    mem1 = memory_manager.create_memory(
        MemoryCreate(
            memory_type="preference",
            content="User prefers step-by-step explanations.",
            confidence=0.98,
            importance=0.90
        ),
        user_id=user_id
    )
    mem2 = memory_manager.create_memory(
        MemoryCreate(
            memory_type="semantic",
            content="User is learning Python programming.",
            confidence=0.95,
            importance=0.85
        ),
        user_id=user_id
    )
    # Create and delete a memory
    mem_del = memory_manager.create_memory(
        MemoryCreate(
            memory_type="preference",
            content="User prefers dark mode themes.",
            confidence=0.99,
            importance=0.99
        ),
        user_id=user_id
    )
    memory_manager.delete_memory(mem_del.id, user_id=user_id, soft=True)

    # Setup session
    session = session_manager.get_or_create_session(session_id="SESS-CTX-1", user_id=user_id)
    session_manager.add_message(session.session_id, user_id, "user", "I need help with Python code")

    # Retrieve memories
    results = memory_retriever.retrieve(
        query="Explain this Python function step by step",
        user_id=user_id,
        session_id=session.session_id
    )

    # Ensure deleted memory was not even retrieved
    retrieved_ids = [r.memory.id for r in results]
    assert mem_del.id not in retrieved_ids

    # Build context with default builder
    builder = ContextBuilder(audit_service=audit_service, max_memories=5, context_budget=1200)
    prompt, injected, stats, budget_used = builder.build_context(
        user_message="Explain this Python function step by step",
        session_state=session,
        retrieval_results=results,
        user_id=user_id
    )

    # Check structural separation
    assert "SYSTEM:" in prompt
    assert "CURRENT SESSION STATE:" in prompt
    assert "LONG-TERM MEMORY:" in prompt
    assert "CURRENT USER:" in prompt

    # Verify injected memories
    injected_ids = [m.memory_id for m in injected]
    assert mem1.id in injected_ids
    assert mem_del.id not in injected_ids


def test_context_budget_rejection(
    memory_manager,
    memory_retriever,
    session_manager,
    audit_service
):
    user_id = "USER-BUDGET"

    # Create memory with lengthy content
    memory_manager.create_memory(
        MemoryCreate(
            memory_type="preference",
            content="User prefers very long detailed explanations with comprehensive code blocks and line by line annotations.",
            confidence=0.99,
            importance=0.95
        ),
        user_id=user_id
    )

    session = session_manager.get_or_create_session(session_id="SESS-BUDGET", user_id=user_id)
    results = memory_retriever.retrieve(
        query="Explain with long detailed annotations",
        user_id=user_id
    )

    # Set tiny budget (e.g. 20 chars) to trigger budget rejection
    tiny_builder = ContextBuilder(audit_service=audit_service, max_memories=5, context_budget=20)
    prompt, injected, stats, budget_used = tiny_builder.build_context(
        user_message="Explain with long detailed annotations",
        session_state=session,
        retrieval_results=results,
        user_id=user_id
    )

    # Must reject due to budget limit
    assert len(injected) == 0
    assert stats.injected == 0
    assert stats.rejected >= 1
