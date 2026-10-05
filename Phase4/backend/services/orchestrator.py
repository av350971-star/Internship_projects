"""
ORCHESTRATOR SERVICE (Multi-Turn Tool Execution Loop)
=====================================================
WHY THIS EXISTS:
When an AI assistant uses tools, it often needs multiple steps:
  Example: User says "Check customer CUST-1001's orders and calculate the total."
  1. The LLM cannot calculate the total until it gets the order numbers from the database.
  2. So it first calls `lookup_customer`.
  3. The application runs the query and gives the order numbers back to the LLM.
  4. Now the LLM sees the orders and calls `calculator`.
  5. Finally, the application gives the calculator result to the LLM, which writes the final summary.

This module controls that loop, safeguards against infinite loops (`MAX_TOOL_CALLS = 5`),
handles approval pauses, and creates the structured `OrderSupportSummary` object.
"""

import json
import os
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

from models.output_models import ChatResponse, OrderSupportSummary
from services.tool_registry import get_openai_tools_schema
from services.tool_executor import execute_tool
from services.llm_service import llm_service

load_dotenv()

# Safety limit: Never allow the LLM to call tools more than 5 times in a single turn.
# This prevents runaway costs, infinite loops, or hanging requests.
MAX_TOOL_CALLS = int(os.getenv("MAX_TOOL_CALLS", "5"))


class Orchestrator:
    def __init__(self):
        """
        Store conversational message histories in memory, organized by session_id.
        In a large production app, this would be stored in Redis or a database.
        """
        self._sessions: Dict[str, List[Dict[str, Any]]] = {}

    def get_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Retrieve existing message history for a session, or initialize a new empty list."""
        return self._sessions.setdefault(session_id, [])

    def reset_session(self, session_id: str) -> None:
        """Clear message history for a session when the user clicks 'Reset State'."""
        if session_id in self._sessions:
            del self._sessions[session_id]

    async def process_chat(
        self,
        message: str,
        role: str,
        customer_id: str,
        session_id: Optional[str] = None
    ) -> ChatResponse:
        """
        RUN MULTI-TURN TOOL-CALLING LOOP
        --------------------------------
        WHAT IT DOES STEP BY STEP:
        1. Adds user prompt to the session history.
        2. Starts a loop (up to MAX_TOOL_CALLS = 5).
        3. Asks the LLM: 'Here are the messages and tools. What is the next step?'
        4. If LLM says 'No tool needed, here is the answer' -> Return final response!
        5. If LLM says 'Execute tool X with arguments Y' ->
           - Pass it through our secure 8-step `execute_tool()` pipeline.
           - If it needs human approval, PAUSE the loop and return pending approval!
           - If execution succeeds, append the tool result to message history so the 
             LLM can read it in the next iteration.
        6. If the workflow was an 'Order Support Summary', assemble the structured Pydantic model.
        """

        # Ensure we have a valid session ID
        sid = session_id or f"session_{customer_id}"
        messages = self.get_history(sid)

        # Append incoming user prompt
        messages.append({"role": "user", "content": message})

        # Context containing who is making the request
        context = {
            "user_id": customer_id,
            "role": role
        }

        # Format our 5 tools into standard OpenAI JSON function schemas
        openai_tools = get_openai_tools_schema()

        iteration_count = 0
        all_executed_tool_ids: List[str] = []
        all_tool_calls_info: List[Dict[str, Any]] = []
        tools_used_names: List[str] = []

        # Variables to accumulate data for the structured OrderSupportSummary output
        customer_lookup_data: Optional[Dict[str, Any]] = None
        calculator_total: Optional[float] = None

        # =============================================================
        # THE CONTROLLED EXECUTION LOOP
        # =============================================================
        while iteration_count < MAX_TOOL_CALLS:
            iteration_count += 1

            # Step 1: Query LLM / Semantic Planner
            llm_output = await llm_service.generate_response(
                messages=messages,
                tools=openai_tools,
                context=context
            )

            assistant_content = llm_output.get("content", "")
            requested_tool_calls = llm_output.get("tool_calls", [])

            # Step 2: Did the LLM finish without requesting more tools?
            if not requested_tool_calls:
                # Append assistant's final response to history
                messages.append({"role": "assistant", "content": assistant_content})

                # Check if this query produced data for an OrderSupportSummary
                structured_summary = None
                if customer_lookup_data and calculator_total is not None:
                    structured_summary = OrderSupportSummary(
                        workflow="order_support_summary",
                        customer_id=customer_lookup_data.get("customer_id", customer_id),
                        orders_found=customer_lookup_data.get("orders_count", 0),
                        total_amount=calculator_total,
                        currency="INR",
                        tools_used=tools_used_names,
                        status="completed"
                    ).model_dump()

                return ChatResponse(
                    answer=assistant_content,
                    tool_calls=all_tool_calls_info,
                    pending_approval=None,
                    execution_ids=all_executed_tool_ids,
                    structured_output=structured_summary,
                    error=None
                )

            # Step 3: The LLM requested one or more tool calls
            for tc in requested_tool_calls:
                call_id = tc.get("id", f"call_{iteration_count}")
                tool_name = tc.get("name")
                raw_args = tc.get("arguments", {})

                tools_used_names.append(tool_name)
                all_tool_calls_info.append({
                    "id": call_id,
                    "name": tool_name,
                    "arguments": raw_args
                })

                # ROUTE THROUGH OUR CENTRAL SECURE PIPELINE!
                # (Never call Python functions directly from LLM output)
                exec_result = execute_tool(
                    tool_name=tool_name,
                    raw_arguments=raw_args,
                    user_context=context
                )
                all_executed_tool_ids.append(exec_result["execution_id"])

                # Check if the tool requires Human Approval (Side Effect)
                if exec_result.get("pending_approval"):
                    pending_info = exec_result["pending_approval"]
                    halt_msg = (
                        f"Action '{tool_name}' requires approval before executing. "
                        f"Please review approval request {pending_info.get('approval_id')}."
                    )
                    messages.append({"role": "assistant", "content": halt_msg})

                    # PAUSE THE ENTIRE LOOP! Return to user so they can click Approve/Reject
                    return ChatResponse(
                        answer=halt_msg,
                        tool_calls=all_tool_calls_info,
                        pending_approval=pending_info,
                        execution_ids=all_executed_tool_ids,
                        structured_output=None,
                        error=None
                    )

                # If the tool executed successfully, collect data for multi-turn tracking
                if exec_result.get("success"):
                    res_data = exec_result.get("result")
                    if tool_name == "lookup_customer" and isinstance(res_data, dict):
                        customer_lookup_data = res_data
                    elif tool_name == "calculator" and isinstance(res_data, dict):
                        calc_val = res_data.get("result")
                        if isinstance(calc_val, (int, float)):
                            calculator_total = float(calc_val)

                    # Feed tool result back into message history as a 'tool' message
                    # This allows the LLM to see the result on the next iteration
                    messages.append({
                        "role": "tool",
                        "tool_call_id": call_id,
                        "name": tool_name,
                        "content": json.dumps(res_data)
                    })
                else:
                    # If tool failed (e.g. validation or authorization error), feed error to history
                    err_data = exec_result.get("error") or {"type": "ERROR", "message": "Unknown tool error"}
                    messages.append({
                        "role": "tool",
                        "tool_call_id": call_id,
                        "name": tool_name,
                        "content": json.dumps({"error": err_data})
                    })

        # Step 4: Safeguard against infinite loops if MAX_TOOL_CALLS is exceeded
        limit_msg = f"Operational limit reached: Maximum tool call iterations ({MAX_TOOL_CALLS}) exceeded."
        return ChatResponse(
            answer=limit_msg,
            tool_calls=all_tool_calls_info,
            pending_approval=None,
            execution_ids=all_executed_tool_ids,
            structured_output=None,
            error={"type": "MAX_TOOL_CALLS_EXCEEDED", "message": limit_msg}
        )


# Global singleton instance of Orchestrator
orchestrator = Orchestrator()
