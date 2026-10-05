import sys
import os

# Add project root directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from backend.main import app
from backend import storage, config

client = TestClient(app)

def test_frontend_static_serving():
    """Verify that frontend HTML and compiled React bundle are served directly."""
    response = client.get("/")
    assert response.status_code == 200
    assert "LLM Playground" in response.text or "ChatGPT" in response.text
    assert 'id="root"' in response.text

def test_get_config():
    """Verify dynamic configuration endpoint."""
    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    assert len(data["models"]) > 0
    assert "system_prompts" in data
    assert "base_url" in data
    assert data["default_temperature"] == 0.7

def test_sessions_lifecycle():
    """Verify creating, reading, updating, resetting, and deleting sessions."""
    # 1. List existing sessions (should have at least 2 pre-seeded sessions)
    response = client.get("/api/sessions")
    assert response.status_code == 200
    sessions = response.json()
    assert len(sessions) >= 2

    # 2. Create new session
    create_res = client.post("/api/sessions", json={
        "title": "Test Integration Session",
        "system_prompt": "You are a test assistant.",
        "model": "gpt-4o-mini",
        "temperature": 0.3
    })
    assert create_res.status_code == 201
    created = create_res.json()
    test_id = created["id"]
    assert created["title"] == "Test Integration Session"

    # 3. Read back created session
    get_res = client.get(f"/api/sessions/{test_id}")
    assert get_res.status_code == 200
    assert get_res.json()["system_prompt"] == "You are a test assistant."

    # 4. Update session
    update_res = client.put(f"/api/sessions/{test_id}", json={
        "title": "Updated Session Title",
        "temperature": 0.9
    })
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Updated Session Title"
    assert update_res.json()["temperature"] == 0.9

    # 5. Reset session
    reset_res = client.post(f"/api/sessions/{test_id}/reset")
    assert reset_res.status_code == 200
    assert len(reset_res.json()["session"]["messages"]) == 0

    # 6. Delete session
    del_res = client.delete(f"/api/sessions/{test_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

    # Verify it is gone
    not_found_res = client.get(f"/api/sessions/{test_id}")
    assert not_found_res.status_code == 404

def test_cost_calculation():
    """Verify that calculate_cost gives accurate mathematical results."""
    # gpt-4o-mini pricing: $0.15/1M prompt, $0.60/1M completion
    cost = config.calculate_cost("gpt-4o-mini", prompt_tokens=1000, completion_tokens=1000)
    # 0.00015 + 0.0006 = 0.00075
    assert abs(cost - 0.00075) < 0.00001

def test_chat_error_handling_unconfigured_key():
    """Verify graceful error response when API key is missing or placeholder."""
    # Ensure there is a session to post to
    sessions = client.get("/api/sessions").json()
    session_id = sessions[0]["id"]

    # Send chat with invalid key override to test graceful error handling
    res = client.post("/api/chat", json={
        "session_id": session_id,
        "message": "Hello test",
        "api_key_override": "your_api_key_here"
    })
    # Should return HTTP 400 with helpful error message
    assert res.status_code == 400
    assert "API Key is missing or not configured" in res.json()["detail"]

if __name__ == "__main__":
    print("Running automated backend tests...")
    test_frontend_static_serving()
    print("✓ Frontend static serving passed")
    test_get_config()
    print("✓ Config endpoint passed")
    test_sessions_lifecycle()
    print("✓ Sessions lifecycle passed")
    test_cost_calculation()
    print("✓ Cost calculation passed")
    test_chat_error_handling_unconfigured_key()
    print("✓ Error handling test passed")
    print("\nAll integration tests passed successfully!")
