import pytest
from fastapi.testclient import TestClient
from main import app
from api.deps import memory_manager, session_manager, audit_service, memory_extractor
from models.memory_models import MemoryCreate


@pytest.fixture
def client():
    return TestClient(app)


def test_procedural_memory_crud(client):
    user_headers = {"X-User-ID": "USER-PROC-TEST"}
    # Clean prior
    for m in memory_manager.list_memories("USER-PROC-TEST", status=None):
        memory_manager.delete_memory(m.id, "USER-PROC-TEST", soft=False)

    # 1. Create Procedural Memory via API
    create_resp = client.post(
        "/api/memory",
        json={
            "memory_type": "procedural",
            "content": "When giving code, include a short explanation before the code.",
            "confidence": 0.95,
            "importance": 0.85
        },
        headers=user_headers
    )
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["memory_type"] == "procedural"
    assert "explanation before the code" in created["content"]
    mem_id = created["id"]

    # 2. Get by ID
    get_resp = client.get(f"/api/memory/{mem_id}", headers=user_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["memory_type"] == "procedural"

    # 3. List by Category Filter
    list_proc = client.get("/api/memory?memory_type=procedural", headers=user_headers)
    assert list_proc.status_code == 200
    items = list_proc.json()
    assert len(items) == 1
    assert items[0]["id"] == mem_id

    # List by other category filter should not include it
    list_pref = client.get("/api/memory?memory_type=preference", headers=user_headers)
    assert list_pref.status_code == 200
    assert len(list_pref.json()) == 0

    # 4. Update Procedural Memory
    update_resp = client.put(
        f"/api/memory/{mem_id}",
        json={
            "content": "When giving code, provide endpoint examples and an explanation first.",
            "importance": 0.90
        },
        headers=user_headers
    )
    assert update_resp.status_code == 200
    assert "endpoint examples" in update_resp.json()["content"]

    # 5. Soft Delete
    del_resp = client.delete(f"/api/memory/{mem_id}", headers=user_headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "deleted"

    # Verify not returned in active list
    active_list = client.get("/api/memory?status=active", headers=user_headers).json()
    assert all(m["id"] != mem_id for m in active_list)


def test_procedural_memory_retrieval_and_injection(client):
    user_headers = {"X-User-ID": "USER-PROC-RETRIEVE"}
    for m in memory_manager.list_memories("USER-PROC-RETRIEVE", status=None):
        memory_manager.delete_memory(m.id, "USER-PROC-RETRIEVE", soft=False)

    # Store procedural instruction: "For project debugging, first identify the error and then provide the fix."
    memory_manager.create_memory(
        data=MemoryCreate(
            memory_type="procedural",
            content="For project debugging, first identify the error and then provide the fix.",
            confidence=0.95,
            importance=0.85,
            source="user_explicit"
        ),
        user_id="USER-PROC-RETRIEVE",
        session_id="proc-session-1"
    )

    # Query related to debugging
    chat_resp = client.post(
        "/api/personalized/chat",
        json={"message": "Can you debug this python error in my function?"},
        headers=user_headers
    )
    assert chat_resp.status_code == 200
    data = chat_resp.json()
    # Check that memory was injected
    assert data["memory"]["injected"] >= 1
    injected_contents = [m["content"] for m in data["memory_context"]]
    assert any("identify the error" in c for c in injected_contents)


def test_transient_conversation_not_saved_as_memory():
    # Transient statements should be IGNORED
    transient_queries = [
        "I'm building this today",
        "I am testing this right now",
        "I am currently trying a temporary script",
        "Just testing the session for now"
    ]
    for q in transient_queries:
        decision = memory_extractor.evaluate_and_extract(
            user_message=q,
            user_id="USER-TRANSIENT-TEST",
            session_id="session-transient"
        )
        assert decision.action == "IGNORE", f"Expected IGNORE for transient query: '{q}', got {decision.action}"


def test_explicit_procedural_command_extraction():
    # Explicit workflow instruction should be classified as procedural
    instruction = "When giving code, include a short explanation before the code."
    decision = memory_extractor.evaluate_and_extract(
        user_message=f"Remember this: {instruction}",
        user_id="USER-EXTRACT-PROC",
        session_id="session-proc-extract"
    )
    assert decision.action in ["CREATE", "UPDATE"]
    assert decision.memory_type == "procedural"
    assert "explanation before the code" in decision.content
