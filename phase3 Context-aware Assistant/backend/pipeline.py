"""
Pipeline Orchestrator:
Coordinates the 10-step Context-Aware Support Assistant workflow:
Role Identify -> Question Validation -> State Check -> Prompt Load & Validation ->
Vector RAG Search -> Permission Filter -> AI Summarization -> Relevance History Select ->
Context Budget Enforcement -> LLM Generation -> Safe Debug Metadata.
"""

import time
from typing import Dict, List, Optional
from .config import (
    DEFAULT_CONTEXT_BUDGET,
    DEFAULT_SUMMARIZE_THRESHOLD,
    DEFAULT_MAX_RETRIEVED_DOCS,
    ROLE_CUSTOMER,
    ROLE_SUPPORT_AGENT,
    estimate_tokens
)
from .prompt_manager import prompt_manager
from .retriever import document_retriever
from .context_manager import context_manager
from .llm_service import llm_service

class AssistantPipeline:
    def __init__(self):
        pass

    def run(
        self,
        user_role: str,
        user_question: str,
        conversation_history: List[Dict],
        prompt_version_id: Optional[str] = None,
        existing_summary: Optional[str] = None,
        context_budget: int = DEFAULT_CONTEXT_BUDGET,
        summarize_threshold: int = DEFAULT_SUMMARIZE_THRESHOLD
    ) -> Dict:
        """
        Executes the context-aware pipeline end-to-end and returns:
        - generated answer
        - safe context debug metadata (Strictly NO raw prompts, NO internal doc contents, NO CoT)
        - updated summary
        """
        pipeline_start_time = time.time()
        execution_steps = []

        # 1. Role Identify
        step1_start = time.time()
        normalized_role = user_role.lower().strip()
        if normalized_role not in [ROLE_CUSTOMER, ROLE_SUPPORT_AGENT]:
            normalized_role = ROLE_CUSTOMER

        execution_steps.append({
            "step_number": 1,
            "name": "Role Identify",
            "status": "completed",
            "details": f"Role: '{normalized_role}'",
            "duration_ms": round((time.time() - step1_start) * 1000, 2)
        })

        # 2. User Question
        step2_start = time.time()
        clean_question = user_question.strip()
        query_token_est = estimate_tokens(clean_question)
        execution_steps.append({
            "step_number": 2,
            "name": "User Question",
            "status": "completed",
            "details": f"{len(clean_question)} chars (~{query_token_est} tokens)",
            "duration_ms": round((time.time() - step2_start) * 1000, 2)
        })

        # 3. Conversation State
        step3_start = time.time()
        user_turns = sum(1 for m in conversation_history if m.get("role") == "user")
        execution_steps.append({
            "step_number": 3,
            "name": "Conversation State",
            "status": "completed",
            "details": f"{len(conversation_history)} messages ({user_turns} user turns)",
            "duration_ms": round((time.time() - step3_start) * 1000, 2)
        })

        # 4. Versioned Prompt (with strict role-matching validation)
        step4_start = time.time()
        selected_prompt_obj = prompt_manager.get_prompt(normalized_role, prompt_version_id)
        execution_steps.append({
            "step_number": 4,
            "name": "Versioned Prompt",
            "status": "completed",
            "details": f"Version: '{selected_prompt_obj.version_id}'",
            "duration_ms": round((time.time() - step4_start) * 1000, 2)
        })

        # 5. Support Documents Retrieve (Real Vector RAG via ChromaDB)
        step5_start = time.time()
        retrieval_output = document_retriever.retrieve(
            query=clean_question,
            user_role=normalized_role,
            top_k=DEFAULT_MAX_RETRIEVED_DOCS
        )
        allowed_docs = retrieval_output["retrieved_documents"]
        blocked_count = retrieval_output["blocked_count"]
        execution_steps.append({
            "step_number": 5,
            "name": "Vector RAG Retrieval",
            "status": "completed",
            "details": f"Retrieved {len(allowed_docs)} authorized docs ({blocked_count} restricted blocked)",
            "duration_ms": round((time.time() - step5_start) * 1000, 2)
        })

        # 6 & 7. Summarization, Relevance History Selection & Context Budget Priority
        step6_start = time.time()
        context_data = context_manager.build_context_with_budget(
            system_prompt=selected_prompt_obj.content,
            prompt_version_id=selected_prompt_obj.version_id,
            user_role=normalized_role,
            current_query=clean_question,
            history=conversation_history,
            retrieved_docs=allowed_docs,
            existing_summary=existing_summary,
            context_budget=context_budget,
            summarize_threshold=summarize_threshold
        )
        execution_steps.append({
            "step_number": 6,
            "name": "Budget & Relevance Selection",
            "status": "completed",
            "details": f"Assembled {context_data['total_tokens']}/{context_budget} tokens",
            "duration_ms": round((time.time() - step6_start) * 1000, 2)
        })

        # 8. LLM Generation
        step8_start = time.time()
        llm_output = llm_service.generate_response(
            assembled_prompt=context_data["assembled_prompt"],
            user_role=normalized_role,
            retrieved_docs=context_data["selected_docs"],
            current_query=clean_question,
            prompt_version_id=selected_prompt_obj.version_id
        )
        execution_steps.append({
            "step_number": 8,
            "name": "LLM Generation",
            "status": "completed",
            "details": f"Generated via {llm_output['provider']} ({llm_output['model']})",
            "duration_ms": round((time.time() - step8_start) * 1000, 2)
        })

        total_duration_ms = round((time.time() - pipeline_start_time) * 1000, 2)

        # 9. Construct Safe Debug View (Strictly categories/metadata, NO raw prompt, NO blocked doc content)
        debug_metadata = context_data["debug_metadata"]
        debug_metadata["execution_steps"] = execution_steps
        debug_metadata["total_duration_ms"] = total_duration_ms
        debug_metadata["blocked_docs_count"] = blocked_count

        return {
            "answer": llm_output["text"],
            "debug_view": debug_metadata,
            "summary_text": context_data["summary_text"]
        }

# Global singleton
assistant_pipeline = AssistantPipeline()
