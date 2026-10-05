from models import ResearchState, Finding
from agent import planner, evaluate, record_finding, create_new_state, run_research
from unittest.mock import patch


def test_planner_decisions():
    state = create_new_state("Test Topic")

    # Initially read queue is empty, so planner decides to search
    assert planner(state) == "search"

    # When URLs exist in queue and pages_read < max, it should read
    state.read_queue.append("https://example.com/p1")
    assert planner(state) == "read"

    # When max_pages_to_read is reached, it should not read
    state.pages_read = state.max_pages_to_read
    assert planner(state) == "report"

    # When steps budget is exhausted, it should report
    state.pages_read = 0
    state.steps_used = state.max_steps
    assert planner(state) == "report"


def test_evaluator_checks():
    state = create_new_state("Test Topic")
    
    # Empty findings should trigger issue
    issues = evaluate(state)
    assert len(issues) > 0
    assert any("Insufficient findings" in iss for iss in issues)

    # Valid findings with sources
    state.findings = [
        Finding(claim="Claim 1", source="https://example.com/1"),
        Finding(claim="Claim 2", source="https://example.com/2"),
        Finding(claim="Claim 3", source="https://example.com/3"),
    ]
    issues = evaluate(state)
    assert len(issues) == 0


def test_finding_deduplication():
    state = create_new_state("Test Topic")
    record_finding(state, "Identical Claim", "https://example.com/1")
    record_finding(state, "Identical Claim", "https://example.com/2")
    assert len(state.findings) == 1


def test_evaluator_strictly_respects_budget():
    """
    Critical requirement: Evaluator can request extra pass ONLY within budget.
    If steps_used == max_steps, it must NOT execute extra retrieval.
    """
    state = create_new_state("Test Topic")
    # Simulate step budget exhausted
    state.steps_used = state.max_steps
    state.findings = [] # will trigger evaluator issues

    with patch("agent.search_web") as mock_search:
        # Run agent with exhausted budget
        run_research("Test Topic", state)
        # Verify extra search was NOT called because budget was 0
        mock_search.assert_not_called()
        assert state.evaluator_passes == 0
        assert any("step/token budget is EXHAUSTED" in log for log in state.logs)
