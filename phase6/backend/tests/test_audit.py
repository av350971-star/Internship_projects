from models.memory_models import MemoryCreate, MemoryUpdate


def test_audit_trail_complete_events(
    memory_manager,
    memory_retriever,
    context_builder,
    session_manager,
    audit_service
):
    user_id = "USER-AUDIT"
    session = session_manager.get_or_create_session(session_id="SESS-AUDIT-1", user_id=user_id)

    # 1. Created event
    mem = memory_manager.create_memory(
        MemoryCreate(
            memory_type="preference",
            content="User prefers step-by-step Python explanations.",
            confidence=0.98,
            importance=0.85
        ),
        user_id=user_id,
        session_id=session.session_id
    )

    created_logs = audit_service.get_audit_logs(user_id=user_id, memory_id=mem.id, event_type="created")
    assert len(created_logs) >= 1
    assert created_logs[0].event_type == "created"
    assert created_logs[0].memory_id == mem.id

    # 2. Updated event
    memory_manager.update_memory(
        memory_id=mem.id,
        user_id=user_id,
        update=MemoryUpdate(importance=0.95),
        session_id=session.session_id
    )
    updated_logs = audit_service.get_audit_logs(user_id=user_id, memory_id=mem.id, event_type="updated")
    assert len(updated_logs) >= 1

    # 3. Retrieved and Injected events
    results = memory_retriever.retrieve(
        query="Explain this Python function step by step",
        user_id=user_id,
        session_id=session.session_id
    )
    retrieved_logs = audit_service.get_audit_logs(user_id=user_id, memory_id=mem.id, event_type="retrieved")
    assert len(retrieved_logs) >= 1
    assert retrieved_logs[0].query == "Explain this Python function step by step"

    prompt, injected, stats, _ = context_builder.build_context(
        user_message="Explain this Python function step by step",
        session_state=session,
        retrieval_results=results,
        user_id=user_id
    )
    injected_logs = audit_service.get_audit_logs(user_id=user_id, memory_id=mem.id, event_type="injected")
    assert len(injected_logs) >= 1
    assert injected_logs[0].injected is True

    # 4. Rejected event (query with low relevance)
    irrelevant_results = memory_retriever.retrieve(
        query="What is the weather like in Tokyo?",
        user_id=user_id,
        session_id=session.session_id
    )
    rejected_logs = audit_service.get_audit_logs(user_id=user_id, memory_id=mem.id, event_type="rejected")
    assert len(rejected_logs) >= 1
    assert rejected_logs[0].injected is False
    assert "Below relevance threshold" in (rejected_logs[0].reason or "")

    # 5. Deleted event
    memory_manager.delete_memory(
        memory_id=mem.id,
        user_id=user_id,
        session_id=session.session_id,
        soft=True
    )
    deleted_logs = audit_service.get_audit_logs(user_id=user_id, memory_id=mem.id, event_type="deleted")
    assert len(deleted_logs) >= 1
    assert deleted_logs[0].event_type == "deleted"
