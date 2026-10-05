from models.memory_models import MemoryCreate


def test_session_lifecycle_and_reset_separation(session_manager, memory_manager):
    user_id = "USER-SESSION-TEST"

    # 1. Create long-term memory for user
    mem = memory_manager.create_memory(
        MemoryCreate(
            memory_type="preference",
            content="User prefers step-by-step Python explanations.",
            confidence=0.98
        ),
        user_id=user_id
    )

    # 2. Start session and add conversation turns & temporary state
    session = session_manager.get_or_create_session(session_id="SESS-100", user_id=user_id)
    session_manager.add_message(session.session_id, user_id, "user", "Hello! Help me with Python.")
    session_manager.add_message(session.session_id, user_id, "assistant", "Sure, what are you working on?")

    # Verify session has messages
    current_session = session_manager.get_session(session.session_id, user_id)
    assert current_session is not None
    assert len(current_session.messages) == 2

    # 3. Trigger Session Reset
    reset_result = session_manager.reset_session(session.session_id, user_id)
    assert len(reset_result.messages) == 0
    assert reset_result.current_task is None

    # Verify session in storage has 0 messages
    reloaded_session = session_manager.get_session(session.session_id, user_id)
    assert reloaded_session is not None
    assert len(reloaded_session.messages) == 0

    # 4. CRITICAL ASSERTION: Long-term memory MUST still exist intact!
    stored_memories = memory_manager.list_memories(user_id=user_id, status="active")
    assert len(stored_memories) == 1
    assert stored_memories[0].id == mem.id
    assert stored_memories[0].content == "User prefers step-by-step Python explanations."
