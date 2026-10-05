"""
Context Manager:
- Real Relevance-Based History Selection (Embedding Cosine Similarity + Recency Weight)
- Real AI Conversation Summarization (Entity-preserving via LLM)
- Strict Context Budget Enforcement (Priority-based incremental trimming)
- Defense-in-Depth Role Authorization (Excludes unauthorized internal documents)
"""

from typing import List, Dict, Tuple, Optional
import numpy as np
from sentence_transformers import SentenceTransformer

from .config import (
    estimate_tokens,
    DEFAULT_CONTEXT_BUDGET,
    DEFAULT_SUMMARIZE_THRESHOLD,
    HISTORY_RELEVANCE_WEIGHT,
    HISTORY_RECENCY_WEIGHT,
    EMBEDDING_MODEL,
    ROLE_CUSTOMER,
    ROLE_SUPPORT_AGENT
)
from .llm_service import llm_service

class ContextManager:
    def __init__(self):
        self._model = None

    @property
    def model(self) -> SentenceTransformer:
        if self._model is None:
            self._model = SentenceTransformer(EMBEDDING_MODEL)
        return self._model

    def select_relevant_history(
        self,
        messages: List[Dict],
        current_query: str,
        available_token_budget: int
    ) -> Tuple[List[Dict], List[Dict], int]:
        """
        Real semantic relevance-based history selection:
        1. Encodes current query and candidate past messages.
        2. Computes cosine similarity between query and each message.
        3. Computes normalized recency score.
        4. Calculates combined score = (relevance_weight * similarity) + (recency_weight * recency).
        5. Greedily selects top scoring messages that fit within available_token_budget.
        6. Restores chronological order for assembled context.
        """
        if not messages or available_token_budget <= 0:
            return [], list(messages), 0

        total_msgs = len(messages)
        message_texts = [f"{m.get('role', 'user')}: {m.get('content', '')}" for m in messages]

        # Compute embeddings
        query_emb = self.model.encode(current_query, convert_to_numpy=True)
        query_norm = np.linalg.norm(query_emb)
        msg_embs = self.model.encode(message_texts, convert_to_numpy=True)

        scored_candidates = []
        for idx, (msg, emb) in enumerate(zip(messages, msg_embs)):
            # Cosine similarity
            emb_norm = np.linalg.norm(emb)
            if query_norm > 0 and emb_norm > 0:
                cosine_sim = float(np.dot(query_emb, emb) / (query_norm * emb_norm))
                # Normalize cosine similarity from [-1, 1] to [0, 1]
                semantic_sim = max(0.0, min(1.0, (cosine_sim + 1.0) / 2.0))
            else:
                semantic_sim = 0.0

            # Recency score (0.0 to 1.0)
            recency_score = (idx + 1) / total_msgs

            # Combined weighted score
            combined_score = (
                (HISTORY_RELEVANCE_WEIGHT * semantic_sim) +
                (HISTORY_RECENCY_WEIGHT * recency_score)
            )

            msg_token_cost = estimate_tokens(f"{msg.get('role')}: {msg.get('content')}")
            scored_candidates.append({
                "original_index": idx,
                "message": msg,
                "combined_score": combined_score,
                "semantic_sim": semantic_sim,
                "recency_score": recency_score,
                "token_cost": msg_token_cost
            })

        # Sort by combined score descending
        scored_candidates.sort(key=lambda x: x["combined_score"], reverse=True)

        selected_entries = []
        pruned_entries = []
        tokens_used = 0

        for cand in scored_candidates:
            if tokens_used + cand["token_cost"] <= available_token_budget:
                selected_entries.append(cand)
                tokens_used += cand["token_cost"]
            else:
                pruned_entries.append(cand)

        # Restore chronological order
        selected_entries.sort(key=lambda x: x["original_index"])
        selected_messages = [x["message"] for x in selected_entries]
        pruned_messages = [x["message"] for x in pruned_entries]

        return selected_messages, pruned_messages, tokens_used

    def build_context_with_budget(
        self,
        system_prompt: str,
        prompt_version_id: str,
        user_role: str,
        current_query: str,
        history: List[Dict],
        retrieved_docs: List[Dict],
        existing_summary: Optional[str] = None,
        context_budget: int = DEFAULT_CONTEXT_BUDGET,
        summarize_threshold: int = DEFAULT_SUMMARIZE_THRESHOLD
    ) -> Dict:
        """
        Central context assembler strictly enforcing:
        - Defense-in-depth role authorization
        - Context priority order:
          1. Current User Question (Mandatory)
          2. System / Role Instructions (Mandatory)
          3. High-relevance retrieved documents (Authorized only)
          4. High-relevance conversation history
          5. Conversation summary
          6. Lower relevance context
        - Final verification that actual assembled tokens <= context_budget.
        """
        # --- DEFENSE-IN-DEPTH SECURITY CHECK ---
        authorized_docs = []
        for doc in retrieved_docs:
            allowed_roles = doc.get("allowed_roles", [])
            # Under NO circumstance can customer receive unauthorized internal docs
            if user_role not in allowed_roles:
                continue
            if user_role == ROLE_CUSTOMER and doc.get("category") == "internal":
                continue
            authorized_docs.append(doc)

        # --- MANDATORY BASE ALLOCATION ---
        query_text = f"User: {current_query.strip()}\nAssistant:"
        query_tokens = estimate_tokens(query_text)

        sys_header = f"=== SYSTEM INSTRUCTIONS (VERSION: {prompt_version_id}) ===\n{system_prompt.strip()}"
        role_boundary = (
            f"\n=== ACTIVE USER ROLE & BOUNDARY ===\nActive Role: {user_role.upper()}\n"
            f"Allowed Context: {'Public support policies and FAQs only' if user_role == ROLE_CUSTOMER else 'Internal operational SOPs, supervisor escalation, and override codes'}"
        )
        base_instructions = sys_header + "\n" + role_boundary
        base_tokens = estimate_tokens(base_instructions) + query_tokens

        # Available space after mandatory elements
        remaining_budget = max(0, context_budget - base_tokens)

        # --- SUMMARIZATION CHECK ---
        # Count user turns
        user_turn_count = sum(1 for m in history if m.get("role") == "user")
        was_summarized = False
        summary_text = existing_summary or ""
        tokens_saved = 0

        messages_for_history = list(history)

        if user_turn_count >= summarize_threshold and len(history) >= 4:
            was_summarized = True
            # Keep the last 2 turns (1 user + 1 assistant) raw; summarize older turns
            split_idx = max(0, len(history) - 2)
            older_turns = history[:split_idx]
            messages_for_history = history[split_idx:]

            # If no cached summary exists for these older turns, generate with LLM
            if not summary_text:
                summary_text = llm_service.generate_summary(older_turns)

            raw_older_tokens = sum(estimate_tokens(f"{m.get('role')}: {m.get('content')}") for m in older_turns)
            summary_tokens_cost = estimate_tokens(summary_text)
            tokens_saved = max(0, raw_older_tokens - summary_tokens_cost)

        summary_block = f"\n=== CONVERSATION SUMMARY ===\n{summary_text.strip()}" if (was_summarized and summary_text) else ""
        summary_tokens = estimate_tokens(summary_block) if summary_block else 0

        # Deduct summary from remaining budget
        remaining_budget = max(0, remaining_budget - summary_tokens)

        # --- PRIORITY 3: HIGH-RELEVANCE RETRIEVED DOCUMENTS ---
        # Allocate up to 60% of remaining budget for support documents
        doc_budget = int(remaining_budget * 0.60)
        selected_docs = []
        doc_tokens_used = 0

        for doc in authorized_docs:
            block = f"[{doc.get('id')}] {doc.get('title')}\n{doc.get('content')}"
            cost = estimate_tokens(block)
            if doc_tokens_used + cost <= doc_budget:
                selected_docs.append(doc)
                doc_tokens_used += cost

        # Flow unused doc budget into history
        unused_doc_budget = max(0, doc_budget - doc_tokens_used)
        history_budget = max(0, (remaining_budget - doc_budget) + unused_doc_budget)

        # --- PRIORITY 4: RELEVANT CONVERSATION HISTORY ---
        selected_history, pruned_history, hist_tokens_used = self.select_relevant_history(
            messages=messages_for_history,
            current_query=current_query,
            available_token_budget=history_budget
        )

        # --- CONSTRUCT FINAL CONTEXT ---
        def build_full_prompt(inc_docs, inc_hist, inc_summary):
            parts = [base_instructions]
            if inc_summary and summary_block:
                parts.append(summary_block)
            if inc_hist:
                parts.append("\n=== RECENT CONVERSATION HISTORY ===")
                for m in inc_hist:
                    speaker = "Customer" if m.get("role") == "user" else "Assistant"
                    parts.append(f"{speaker}: {m.get('content', '').strip()}")
            if inc_docs:
                parts.append("\n=== VERIFIED SUPPORT DOCUMENTS ===")
                for i, d in enumerate(inc_docs, 1):
                    parts.append(f"[{i}] {d.get('title')}\n{d.get('content')}")
            parts.append(f"\n=== CURRENT QUESTION ===\n{query_text}")
            return "\n".join(parts)

        # Check total tokens incrementally
        assembled_prompt = build_full_prompt(selected_docs, selected_history, was_summarized)
        total_tokens = estimate_tokens(assembled_prompt)

        # Strict Context Budget Trimming if total exceeds budget
        while total_tokens > context_budget and selected_history:
            # Drop lowest-priority history turn first
            selected_history.pop(0)
            assembled_prompt = build_full_prompt(selected_docs, selected_history, was_summarized)
            total_tokens = estimate_tokens(assembled_prompt)

        while total_tokens > context_budget and selected_docs:
            # Drop lower-priority document if still exceeding
            selected_docs.pop()
            assembled_prompt = build_full_prompt(selected_docs, selected_history, was_summarized)
            total_tokens = estimate_tokens(assembled_prompt)

        if total_tokens > context_budget and was_summarized:
            # Drop summary if still exceeding
            was_summarized = False
            assembled_prompt = build_full_prompt(selected_docs, selected_history, False)
            total_tokens = estimate_tokens(assembled_prompt)

        # Safe metadata for debug view (NEVER return raw prompt or internal document texts)
        debug_metadata = {
            "role": user_role,
            "role_display": "Customer" if user_role == ROLE_CUSTOMER else "Support Agent",
            "prompt_version": prompt_version_id,
            "summary_used": was_summarized,
            "tokens_saved": tokens_saved,
            "relevant_history_count": len(selected_history),
            "retrieved_document_count": len(selected_docs),
            "allowed_context_categories": ["Conversation", "Public Support Documents"] + (["Internal Support Documents"] if user_role == ROLE_SUPPORT_AGENT else []),
            "restricted_context_categories": ["Internal Support Documents"] if user_role == ROLE_CUSTOMER else [],
            "context_budget": context_budget,
            "estimated_tokens": total_tokens
        }

        return {
            "assembled_prompt": assembled_prompt,
            "total_tokens": total_tokens,
            "context_budget": context_budget,
            "was_summarized": was_summarized,
            "summary_text": summary_text if was_summarized else "",
            "selected_docs": selected_docs,
            "selected_history": selected_history,
            "debug_metadata": debug_metadata
        }

# Global singleton
context_manager = ContextManager()
