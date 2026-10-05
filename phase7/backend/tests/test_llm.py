from unittest.mock import patch, MagicMock
from llm import call_chat_completion, plan_search_angles, extract_claims_from_text, estimate_tokens


def test_estimate_tokens():
    text = "Hello world! This is a test."
    tokens = estimate_tokens(text)
    assert tokens > 0


def test_call_chat_completion_success():
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [
            {"message": {"content": "Test completion response"}}
        ]
    }

    with patch("httpx.Client.post", return_value=mock_resp):
        content, tokens = call_chat_completion("Hello")
        assert content == "Test completion response"
        assert tokens > 0


def test_plan_search_angles_fallback():
    # When API fails or returns None, it falls back to 3 distinct angles
    with patch("llm.call_chat_completion", return_value=(None, 10)):
        angles, tokens = plan_search_angles("Quantum Computing")
        assert len(angles) == 3
        assert any("Quantum Computing" in a for a in angles)


def test_extract_claims_from_text_fallback():
    sample_text = (
        "Quantum computers leverage superposition to calculate at immense speed. "
        "They offer major breakthroughs for cryptographic systems and discovery."
    )
    with patch("llm.call_chat_completion", return_value=(None, 10)):
        claims, tokens = extract_claims_from_text("Quantum Computing", sample_text, "https://example.com")
        assert len(claims) > 0
        assert "claim" in claims[0]
