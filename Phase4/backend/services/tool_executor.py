"""
CENTRAL TOOL EXECUTION ENGINE
=============================
WHY THIS EXISTS:
The most important rule in secure AI design: 
"The LLM can REQUEST a tool call, but the application decides if it executes."

If you let the LLM directly execute Python functions like `func(**llm_output)`, 
an attacker could execute arbitrary code, bypass permissions, or trigger unwanted 
side-effects.

This module acts as the mandatory 8-step pipeline that every tool call MUST pass:
  Step 1: Does the tool exist in our registry?
  Step 2: Is the user's role allowed to use this tool? (Authorization)
  Step 3: Do the inputs match our schema rules? (Pydantic Validation)
  Step 4 & 5: Is this a side-effect tool needing human approval? (Approval Gate)
  Step 6: Execute the actual Python function handler
  Step 7: Record every detail in the audit log (arguments, status, elapsed time)
  Step 8: Return a structured, clean response
"""

import time
from typing import Any, Dict, Optional
from pydantic import ValidationError

from services.tool_registry import TOOLS
from services.authorization import authorize
from services.approval_service import approval_service
from services.execution_logger import execution_logger


def execute_tool(
    tool_name: str,
    raw_arguments: Dict[str, Any],
    user_context: Dict[str, Any],
    approved_approval_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    EXECUTE TOOL WITH FULL SECURITY CHECKS
    --------------------------------------
    Parameters:
      - tool_name: Name of tool to execute (e.g. 'calculator', 'create_ticket')
      - raw_arguments: Dictionary of arguments supplied by the LLM (untrusted!)
      - user_context: Context containing 'user_id' and 'role'
      - approved_approval_id: (Optional) ID of a human-approved token for side-effects

    Returns:
      A dictionary containing success flag, tool name, execution ID, 
      result (if successful), error (if failed), and pending approval (if paused).
    """

    # Start timer to measure how many milliseconds the execution took
    start_time = time.perf_counter()
    user_id = user_context.get("user_id", "CUST-1001")
    user_role = user_context.get("role", "customer")

    # Initial state tracking variables
    validated_args = None
    validation_status = "SKIPPED"
    auth_result = {"allowed": False, "reason": None}
    approval_result = {"required": False, "status": "not_required", "approval_id": None}
    handler_result = None
    error_payload = None

    try:
        # =====================================================================
        # STEP 1: Check if the tool exists in our central registry
        # Prevents execution of unknown or hallucinated function names.
        # =====================================================================
        if tool_name not in TOOLS:
            error_payload = {
                "type": "UNKNOWN_TOOL_ERROR",
                "message": f"Requested tool '{tool_name}' does not exist in registry."
            }
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            # Record failed attempt in audit log
            log = execution_logger.record(
                user_id=user_id,
                role=user_role,
                tool=tool_name,
                raw_arguments=raw_arguments,
                validated_arguments=None,
                validation_status="FAILED",
                authorization=auth_result,
                approval=approval_result,
                result=None,
                error=error_payload,
                elapsed_ms=elapsed_ms
            )
            return {
                "success": False,
                "tool": tool_name,
                "execution_id": log.execution_id,
                "error": error_payload,
                "result": None,
                "pending_approval": None,
                "elapsed_ms": elapsed_ms
            }

        tool_def = TOOLS[tool_name]

        # =====================================================================
        # STEP 2: Check Role Authorization (RBAC)
        # Verify if the user's role has permission for this tool and owns the data.
        # =====================================================================
        is_allowed, auth_reason = authorize(user_role, tool_name, raw_arguments, user_id)
        auth_result = {"allowed": is_allowed, "reason": auth_reason}

        if not is_allowed:
            error_payload = {
                "type": "AUTHORIZATION_ERROR",
                "message": auth_reason or f"Role '{user_role}' is not authorized to execute '{tool_name}'."
            }
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            # Log authorization rejection
            log = execution_logger.record(
                user_id=user_id,
                role=user_role,
                tool=tool_name,
                raw_arguments=raw_arguments,
                validated_arguments=None,
                validation_status="SKIPPED",
                authorization=auth_result,
                approval=approval_result,
                result=None,
                error=error_payload,
                elapsed_ms=elapsed_ms
            )
            return {
                "success": False,
                "tool": tool_name,
                "execution_id": log.execution_id,
                "error": error_payload,
                "result": None,
                "pending_approval": None,
                "elapsed_ms": elapsed_ms
            }

        # =====================================================================
        # STEP 3: Validate Tool Arguments with Pydantic
        # Checks types, min/max lengths, regex formats, and forbids extra fields.
        # =====================================================================
        schema_cls = tool_def["schema"]
        try:
            # model_validate converts raw dict into validated object or raises ValidationError
            validated_model = schema_cls.model_validate(raw_arguments)
            validated_args = validated_model.model_dump()
            validation_status = "PASSED"
        except ValidationError as ve:
            validation_status = "FAILED"
            # Format clean, readable validation errors without raw stack traces
            error_details = []
            for err in ve.errors():
                loc = " -> ".join(str(l) for l in err["loc"])
                error_details.append(f"{loc}: {err['msg']}")
            error_payload = {
                "type": "VALIDATION_ERROR",
                "message": "; ".join(error_details),
                "details": ve.errors()
            }
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            log = execution_logger.record(
                user_id=user_id,
                role=user_role,
                tool=tool_name,
                raw_arguments=raw_arguments,
                validated_arguments=None,
                validation_status=validation_status,
                authorization=auth_result,
                approval=approval_result,
                result=None,
                error=error_payload,
                elapsed_ms=elapsed_ms
            )
            return {
                "success": False,
                "tool": tool_name,
                "execution_id": log.execution_id,
                "error": error_payload,
                "result": None,
                "pending_approval": None,
                "elapsed_ms": elapsed_ms
            }

        # =====================================================================
        # STEPS 4 & 5: Check Side-Effects & Human Approval Requirement
        # Tools that modify data (create_ticket, send_mock_email) must NEVER run
        # automatically without a human clicking "Approve".
        # =====================================================================
        requires_approval = tool_def.get("requires_approval", False)
        if requires_approval:
            approval_result["required"] = True

            # Case A: If this call already has an approved token from the operator:
            if approved_approval_id:
                appr = approval_service.get_approval(approved_approval_id)
                if not appr:
                    error_payload = {
                        "type": "APPROVAL_ERROR",
                        "message": f"Approval reference '{approved_approval_id}' was not found."
                    }
                elif appr.status != "approved":
                    error_payload = {
                        "type": "APPROVAL_ERROR",
                        "message": f"Approval '{approved_approval_id}' status is '{appr.status}', execution rejected."
                    }
                else:
                    approval_result["status"] = "approved"
                    approval_result["approval_id"] = approved_approval_id
            else:
                # Case B: First time request -> create pending approval and PAUSE execution!
                appr_req = approval_service.create_approval(
                    tool=tool_name,
                    user_id=user_id,
                    user_role=user_role,
                    arguments=validated_args
                )
                approval_result["status"] = "pending"
                approval_result["approval_id"] = appr_req.approval_id

                elapsed_ms = (time.perf_counter() - start_time) * 1000
                log = execution_logger.record(
                    user_id=user_id,
                    role=user_role,
                    tool=tool_name,
                    raw_arguments=raw_arguments,
                    validated_arguments=validated_args,
                    validation_status=validation_status,
                    authorization=auth_result,
                    approval=approval_result,
                    result={"status": "AWAITING_USER_APPROVAL", "approval_id": appr_req.approval_id},
                    error=None,
                    elapsed_ms=elapsed_ms
                )
                # Return immediately without executing the handler!
                return {
                    "success": False,
                    "tool": tool_name,
                    "execution_id": log.execution_id,
                    "error": None,
                    "result": None,
                    "pending_approval": appr_req.model_dump(),
                    "message": f"Tool '{tool_name}' requires user approval before execution.",
                    "elapsed_ms": elapsed_ms
                }

        # =====================================================================
        # STEP 6: Execute the Python Handler
        # All checks passed! Now it is safe to invoke the Python function.
        # =====================================================================
        handler = tool_def["handler"]
        try:
            handler_result = handler(**validated_args)
        except Exception as ex:
            error_payload = {
                "type": "TOOL_EXECUTION_ERROR",
                "message": str(ex)
            }

        # =====================================================================
        # STEP 7: Record Audit Log
        # Record complete audit entry with validated arguments and duration.
        # =====================================================================
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        log = execution_logger.record(
            user_id=user_id,
            role=user_role,
            tool=tool_name,
            raw_arguments=raw_arguments,
            validated_arguments=validated_args,
            validation_status=validation_status,
            authorization=auth_result,
            approval=approval_result,
            result=handler_result,
            error=error_payload,
            elapsed_ms=elapsed_ms
        )

        # =====================================================================
        # STEP 8: Return Structured Result
        # Deliver sanitized output and execution ID back to the orchestrator.
        # =====================================================================
        return {
            "success": error_payload is None,
            "tool": tool_name,
            "execution_id": log.execution_id,
            "result": handler_result,
            "error": error_payload,
            "pending_approval": None,
            "elapsed_ms": elapsed_ms
        }

    except Exception as e:
        # Unexpected fallback safety catch to prevent unhandled server crashes
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        error_payload = {
            "type": "INTERNAL_EXECUTION_ERROR",
            "message": f"Unexpected execution error: {str(e)}"
        }
        log = execution_logger.record(
            user_id=user_id,
            role=user_role,
            tool=tool_name,
            raw_arguments=raw_arguments,
            validated_arguments=validated_args,
            validation_status=validation_status,
            authorization=auth_result,
            approval=approval_result,
            result=None,
            error=error_payload,
            elapsed_ms=elapsed_ms
        )
        return {
            "success": False,
            "tool": tool_name,
            "execution_id": log.execution_id,
            "result": None,
            "error": error_payload,
            "pending_approval": None,
            "elapsed_ms": elapsed_ms
        }
