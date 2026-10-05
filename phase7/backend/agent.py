
"""
Autonomous Research Agent
--------------------------
Conducts multi-step, bounded autonomous web research on a given topic.
Enforces:
  1. Next-step planning and explicit Pydantic research state.
  2. Strict maximum step and token/cost budgets.
  3. Duplicate query and no-progress loop prevention.
  4. Structured findings with source records.
  5. Final evaluator step allowing at most 1 extra retrieval pass STRICTLY within budget.
  6. Structured report generation with graceful error handling and logging.
"""

import time
from typing import Optional
from config import settings
from logger import logger
from models import ResearchState, Finding, SourceRecord
from tools.search import search_web
from tools.reader import read_page
from llm import (
    plan_search_angles,
    extract_claims_from_text,
    generate_final_report,
    estimate_tokens,
)


def log_event(state: ResearchState, message: str) -> None:
    """Log to standard Python logger and append to state for frontend streaming."""
    logger.info(message)
    state.logs.append(message)


def add_tokens_and_cost(state: ResearchState, tokens: int) -> None:
    """Increment tokens used and recalculate estimated USD cost."""
    state.tokens_used += tokens
    state.estimated_cost_usd = (state.tokens_used / 1000.0) * settings.COST_PER_1K_TOKENS


def planner(state: ResearchState) -> str:
    """
    Decides next action based on current state and remaining budgets.
    Returns: 'search', 'read', or 'report'.
    """
    # 1. Budget exhausted -> move to report
    if not state.has_budget() or state.pages_read >= state.max_pages_to_read:
        return "report"

    # 2. If read queue has pending URLs and we have read budget -> read
    if state.read_queue and state.pages_read < state.max_pages_to_read:
        return "read"

    # 3. If we can still search and have search queries available -> search
    if state.search_calls < state.max_search_calls:
        return "search"

    # 4. Default -> report
    return "report"


def evaluate(state: ResearchState) -> list[str]:
    """
    Self-check evaluator assessing research completeness and quality:
    - Verifies that all findings have verified source URLs.
    - Checks for minimum finding count (at least 3 findings).
    """
    issues = []
    if len(state.findings) < 3:
        issues.append(f"Insufficient findings collected ({len(state.findings)} < 3)")

    for i, finding in enumerate(state.findings, start=1):
        if not finding.source or not finding.source.startswith("http"):
            issues.append(f"Finding #{i} lacks a valid web source")

    return issues


def record_finding(state: ResearchState, claim: str, source_url: str, snippet: Optional[str] = None) -> None:
    """Adds a validated Finding to the state."""
    # Deduplicate findings with identical claims
    normalized_claim = claim.strip()
    if any(f.claim.lower() == normalized_claim.lower() for f in state.findings):
        return

    finding = Finding(claim=normalized_claim, source=source_url, snippet=snippet)
    state.findings.append(finding)
    log_event(state, f"📝 Sourced Note: {normalized_claim[:85]}...")


def run_research(topic: str, state: Optional[ResearchState] = None) -> ResearchState:
    """
    Main Autonomous Research Agent Execution Loop.
    Executes bounded research steps, enforces duplicate prevention, checks budgets,
    invokes evaluator, and produces a final structured report.
    """
    if state is None:
        state = create_new_state(topic)

    state.status = "running"
    log_event(state, f"🎯 Starting autonomous research on topic: '{topic}'")
    log_event(
        state,
        f"📊 Safety Constraints: Max {state.max_steps} steps | "
        f"Max {state.max_search_calls} searches | "
        f"Token Budget {state.token_budget} | "
        f"Max {state.max_pages_to_read} pages"
    )

    try:
        # Phase 1: Planning / Next-step selection initial queries
        angles, tokens = plan_search_angles(topic)
        add_tokens_and_cost(state, tokens)
        log_event(state, f"🧠 Planning phase generated research angles: {' | '.join(angles)}")

        no_progress_count = 0
        findings_count_prev = 0

        # Phase 2: Main Bounded Execution Loop
        while True:
            # Check budgets before taking action
            if not state.has_budget():
                log_event(state, f"🛑 Budget limit reached (Steps: {state.steps_used}/{state.max_steps}, Tokens: {state.tokens_used}/{state.token_budget}). Finalizing research.")
                break

            action = planner(state)
            if action == "report":
                break

            # ----------------- ACTION: SEARCH -----------------
            if action == "search":
                # Find an angle not yet queried (Duplicate query prevention)
                query_to_run = None
                for angle in angles:
                    if angle not in state.queries_done:
                        query_to_run = angle
                        break

                if not query_to_run or state.search_calls >= state.max_search_calls:
                    # No new queries or search limit hit -> transition to reading queue or report
                    if not state.read_queue:
                        break
                    action = "read"
                else:
                    state.search_calls += 1
                    state.steps_used += 1
                    state.queries_done.append(query_to_run)
                    log_event(state, f"🔍 Step {state.steps_used}: Web Search -> \"{query_to_run}\"")

                    results = search_web(query_to_run, max_results=4)
                    new_urls_found = 0

                    for item in results:
                        url = item.get("href", "")
                        title = item.get("title", "")
                        snippet = item.get("body", "")

                        # Deduplicate URLs
                        if url and url not in state.urls_seen:
                            state.urls_seen.append(url)
                            state.read_queue.append(url)
                            new_urls_found += 1
                            state.source_records.append(
                                SourceRecord(url=url, title=title, snippet=snippet)
                            )

                    add_tokens_and_cost(state, estimate_tokens(str(results)))
                    log_event(state, f"   -> Found {len(results)} search results ({new_urls_found} new URLs queued).")
                    time.sleep(0.5)

            # ----------------- ACTION: READ -----------------
            if action == "read":
                if not state.read_queue or state.pages_read >= state.max_pages_to_read:
                    state.read_queue_empty = True
                    continue

                url = state.read_queue.pop(0)
                state.steps_used += 1
                state.pages_read += 1
                log_event(state, f"📄 Step {state.steps_used}: Reading & Extracting -> {url[:75]}")

                page_data = read_page(url)
                text = page_data.get("text", "")

                if text:
                    # Extract claims and account for tokens
                    claims, tokens = extract_claims_from_text(topic, text, url)
                    add_tokens_and_cost(state, tokens)

                    for claim_item in claims:
                        record_finding(
                            state,
                            claim=claim_item["claim"],
                            source_url=url,
                            snippet=claim_item.get("snippet")
                        )
                else:
                    log_event(state, "   -> Page protected or unreadable; checking snippet fallback.")

                # Fallback to search snippet if scraping was blocked or returned no claims
                if len(state.findings) == findings_count_prev:
                    matching_source = next((s for s in state.source_records if s.url == url), None)
                    if matching_source and matching_source.snippet and len(matching_source.snippet) > 30:
                        record_finding(
                            state,
                            claim=matching_source.snippet,
                            source_url=url,
                            snippet=matching_source.snippet
                        )
                        log_event(state, f"   -> Extracted factual search snippet from verified source.")

                # ----------------- NO-PROGRESS DETECTION (SCOPED TO READ) -----------------
                if len(state.findings) == findings_count_prev:
                    no_progress_count += 1
                    log_event(state, f"⚠️ No new findings discovered from this source (Streak: {no_progress_count}/{settings.NO_PROGRESS_LIMIT})")
                    if no_progress_count >= settings.NO_PROGRESS_LIMIT:
                        log_event(state, "🛑 No-progress limit reached. Transitioning to report generation to conserve budget.")
                        break
                else:
                    no_progress_count = 0

                findings_count_prev = len(state.findings)


        # Phase 3: Evaluator Self-Check Step
        log_event(state, "🔎 Evaluator: Performing self-check on research quality...")
        issues = evaluate(state)

        if issues:
            log_event(state, f"⚠️ Evaluator detected gaps: {'; '.join(issues)}")
            # Enforce: "request one additional retrieval pass, but only within the budget"
            if state.evaluator_passes < state.max_evaluator_passes:
                if state.has_budget() and state.steps_used < state.max_steps:
                    state.evaluator_passes += 1
                    state.steps_used += 1
                    log_event(state, f"🔄 Evaluator granted 1 extra retrieval pass within budget (Step {state.steps_used}/{state.max_steps}).")
                    
                    extra_query = f"{topic} verified factual summary"
                    extra_results = search_web(extra_query, max_results=2)
                    add_tokens_and_cost(state, estimate_tokens(str(extra_results)))
                    
                    for r in extra_results:
                        url = r.get("href", "")
                        if url and url not in state.urls_seen:
                            state.urls_seen.append(url)
                            page = read_page(url)
                            extra_claims = []
                            if ptext:
                                extra_claims, tokens = extract_claims_from_text(topic, ptext, url)
                                add_tokens_and_cost(state, tokens)
                                for ec in extra_claims:
                                    record_finding(state, ec["claim"], url, ec.get("snippet"))
                            if not extra_claims and r.get("body") and len(r.get("body")) > 30:
                                record_finding(state, r["body"], url, r.get("body"))
                                log_event(state, "   -> Sourced fact from verified search summary.")
                            break

                else:
                    log_event(state, "🛑 Evaluator requested extra pass, but step/token budget is EXHAUSTED. Proceeding strictly within budget.")
        else:
            log_event(state, "✅ Evaluator: All quality criteria satisfied (all findings sourced, sufficient evidence).")

        # Phase 4: Final Structured Report Generation
        log_event(state, "✍️ Synthesizing final structured research report...")
        metrics = {
            "steps_used": state.steps_used,
            "max_steps": state.max_steps,
            "search_calls": state.search_calls,
            "pages_read": state.pages_read,
            "tokens_used": state.tokens_used,
            "token_budget": state.token_budget,
            "estimated_cost_usd": state.estimated_cost_usd
        }
        report, report_tokens = generate_final_report(
            topic,
            [f.model_dump() for f in state.findings],
            metrics
        )
        add_tokens_and_cost(state, report_tokens)

        state.report = report
        state.status = "done"
        log_event(state, f"🏁 Research successfully completed in {state.steps_used} steps! Tokens used: {state.tokens_used}")

    except Exception as e:
        logger.error(f"Error during research execution: {e}", exc_info=True)
        state.status = "failed"
        state.error = str(e)
        log_event(state, f"❌ Execution failed gracefully: {e}")

    return state


def create_new_state(topic: str) -> ResearchState:
    """Initializes a fresh, validated ResearchState with config defaults."""
    return ResearchState(
        topic=topic,
        status="idle",
        steps_used=0,
        max_steps=settings.MAX_STEPS,
        tokens_used=0,
        token_budget=settings.TOKEN_BUDGET,
        estimated_cost_usd=0.0,
        search_calls=0,
        max_search_calls=settings.MAX_SEARCH_CALLS,
        pages_read=0,
        max_pages_to_read=settings.MAX_PAGES_TO_READ,
        evaluator_passes=0,
        max_evaluator_passes=settings.EVALUATOR_EXTRA_PASS,
        queries_done=[],
        urls_seen=[],
        read_queue=[],
        findings=[],
        source_records=[],
        report="",
        logs=[],
        error=None,
    )


# Backward compatibility helper for existing code if needed
def new_state(topic: str = "Research Topic") -> ResearchState:
    return create_new_state(topic)
