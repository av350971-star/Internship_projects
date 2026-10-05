import pytest
from pydantic import ValidationError
from models import Finding, SourceRecord, ResearchState, ResearchRequest


def test_research_request_validation():
    # Valid input
    req = ResearchRequest(topic="  Quantum Computing  ")
    assert req.topic == "Quantum Computing"

    # Invalid empty or whitespace topic
    with pytest.raises(ValidationError):
        ResearchRequest(topic="   ")

    with pytest.raises(ValidationError):
        ResearchRequest(topic="")


def test_finding_and_source_record():
    finding = Finding(claim="AI assists in diagnosis", source="https://example.com/ai")
    assert finding.claim == "AI assists in diagnosis"
    assert finding.source == "https://example.com/ai"

    source = SourceRecord(url="https://example.com/ai", title="AI in Med", snippet="Snippet")
    assert source.url == "https://example.com/ai"
    assert source.accessed_at is not None


def test_research_state_budget_check():
    state = ResearchState(
        topic="Renewable Energy",
        steps_used=2,
        max_steps=8,
        tokens_used=500,
        token_budget=1000
    )
    assert state.has_budget() is True

    # Step limit reached
    state.steps_used = 8
    assert state.has_budget() is False

    # Token budget reached
    state.steps_used = 3
    state.tokens_used = 1200
    assert state.has_budget() is False
