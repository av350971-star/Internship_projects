#!/usr/bin/env python3
"""
25-Question Evaluation Runner for Cited Knowledge Assistant
Tests:
- Direct Fact Retrieval
- Semantic / Paraphrased Queries
- Keyword & Code Identifier Queries
- Cross-Document Synthesis
- No-Answer / Out-of-Domain Queries (Must Decline)
- Adversarial / Prompt Injection Attacks (Must Decline / Grounded)
- Cross-Tenant Data Isolation Attacks (Must Decline)
"""

import sys
import json
import asyncio
import time
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from backend.config import settings
from backend.storage.sqlite_store import store
from backend.main import auto_seed_sample_documents, chat_with_assistant, ChatRequest
from backend.services.evaluation_dataset import EVALUATION_QUESTIONS

async def run_evaluation():
    print("=" * 80)
    print("🔍 CITED KNOWLEDGE ASSISTANT — 25-QUESTION BENCHMARK SUITE")
    print("=" * 80)

    # Initialize store and seed if necessary
    store.init_db()
    auto_seed_sample_documents()

    print(f"\n🚀 Running 25 Evaluation Tests against AI Service ({settings.AI_MODEL})...\n")

    results = []
    category_stats = {}
    passed_total = 0

    header = f"{'ID':<3} | {'Category':<22} | {'Tenant':<18} | {'Exp':<7} | {'Act':<9} | {'Score':<6} | {'Time(ms)':<8} | {'Status'}"
    print(header)
    print("-" * len(header))

    for q in EVALUATION_QUESTIONS:
        qid = q["id"]
        cat = q["category"]
        tenant = q["tenant_id"]
        exp = q["expected_behavior"]
        q_text = q["question"]

        if cat not in category_stats:
            category_stats[cat] = {"total": 0, "passed": 0}
        category_stats[cat]["total"] += 1

        req = ChatRequest(
            query=q_text,
            tenant_id=tenant,
            search_mode="hybrid",
            alpha=0.5
        )

        res = await chat_with_assistant(req)

        is_declined = res["is_declined"]
        answer_text = res["answer"]
        citations = res["citations"]
        highest_score = res["highest_score"]
        latency = res["latency_ms"]

        test_passed = False
        fail_note = ""

        if exp == "decline":
            if is_declined:
                test_passed = True
            else:
                decline_terms = ["insufficient", "unable to answer", "not contain", "cannot answer"]
                if any(t in answer_text.lower() for t in decline_terms):
                    test_passed = True
                else:
                    fail_note = "Expected decline, but model generated answer."
        else:
            if is_declined:
                fail_note = f"Expected answer, but system declined (score: {highest_score:.3f})."
            else:
                has_keywords = any(kw.lower() in answer_text.lower() for kw in q["expected_keywords"])
                has_citations = len(citations) > 0 or "[" in answer_text
                if has_keywords and has_citations:
                    test_passed = True
                elif not has_keywords:
                    fail_note = f"Missing keywords {q['expected_keywords']}."
                elif not has_citations:
                    fail_note = "Missing citation tags [1]."
                else:
                    test_passed = True

        if test_passed:
            passed_total += 1
            category_stats[cat]["passed"] += 1
            status_str = "✅ PASS"
        else:
            status_str = f"❌ FAIL ({fail_note[:25]}...)" if len(fail_note) > 25 else f"❌ FAIL ({fail_note})"

        act_str = "DECLINE" if is_declined else f"ANSWER[{len(citations)}]"
        print(f"{qid:<3} | {cat:<22} | {tenant:<18} | {exp.upper():<7} | {act_str:<9} | {highest_score:<6.3f} | {latency:<8} | {status_str}")

        results.append({
            "id": qid,
            "category": cat,
            "tenant_id": tenant,
            "question": q_text,
            "expected": exp,
            "actual_declined": is_declined,
            "passed": test_passed,
            "failure_note": fail_note,
            "highest_score": highest_score,
            "latency_ms": latency,
            "citations_count": len(citations),
            "answer_preview": answer_text[:120] + "..." if len(answer_text) > 120 else answer_text
        })

    total = len(EVALUATION_QUESTIONS)
    pass_rate = round((passed_total / total) * 100, 1)

    print("\n" + "=" * 80)
    print("📊 CATEGORY BREAKDOWN SUMMARY")
    print("=" * 80)
    print(f"{'Category':<32} | {'Passed / Total':<16} | {'Pass Rate'}")
    print("-" * 65)
    for cat, stat in category_stats.items():
        rate = round((stat["passed"] / stat["total"]) * 100, 1) if stat["total"] > 0 else 0.0
        print(f"{cat:<32} | {stat['passed']:>2} / {stat['total']:<11} | {rate:>5.1f}%")

    print("-" * 65)
    print(f"🎯 OVERALL BENCHMARK RESULT: {passed_total}/{total} PASSED ({pass_rate}% Success Rate)")
    print("=" * 80)

    # Save to JSON
    output_path = settings.DATA_DIR / "evaluation_results.json"
    with open(output_path, "w") as f:
        json.dump({
            "total": total,
            "passed": passed_total,
            "failed": total - passed_total,
            "pass_rate_percent": pass_rate,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "category_summary": category_stats,
            "results": results
        }, f, indent=2)

    print(f"📁 Benchmark report saved to: {output_path}\n")

if __name__ == "__main__":
    asyncio.run(run_evaluation())
