"""
AUTHORIZATION SERVICE (RBAC - Role-Based Access Control)
========================================================
WHY THIS EXISTS:
In AI applications, the LLM is just a text generator — it doesn't know who is 
logged in or what they are allowed to do. If a customer says "Delete all orders" 
or "Look up customer CUST-1002", the LLM might try to call that tool.

This module acts as a strict security guard BEFORE any tool can run.
It checks:
1. Is the role valid? (customer, support_agent, or admin)
2. Does this role have permission to use this tool?
3. Does this user own the data they are trying to access? (Tenant Isolation)
"""

from typing import Any, Dict, Optional, Tuple
from services.tool_registry import TOOLS

# Only these three roles are recognized by the system.
# Any unknown role string sent by the client is immediately rejected.
VALID_ROLES = {"customer", "support_agent", "admin"}


class AuthorizationError(Exception):
    """Custom exception raised when an unauthorized action is attempted."""
    pass


def authorize(
    user_role: str,
    tool_name: str,
    raw_args: Dict[str, Any],
    current_user_id: str
) -> Tuple[bool, Optional[str]]:
    """
    CHECK IF A USER IS ALLOWED TO RUN A TOOL
    ----------------------------------------
    Parameters:
      - user_role: 'customer', 'support_agent', or 'admin'
      - tool_name: Name of tool requested by LLM (e.g., 'lookup_customer')
      - raw_args: Arguments passed to the tool (e.g., {'customer_id': 'CUST-1002'})
      - current_user_id: ID of the currently logged-in user (e.g., 'CUST-1001')

    Returns:
      - (True, None) if authorized
      - (False, "Reason for rejection") if not authorized
    """

    # -------------------------------------------------------------
    # STEP 1: Verify the role is valid
    # Protects against frontend tampering where someone sends a fake role like "superuser".
    # -------------------------------------------------------------
    if user_role not in VALID_ROLES:
        return False, f"Invalid role '{user_role}'. Allowed roles are: {', '.join(sorted(VALID_ROLES))}."

    # -------------------------------------------------------------
    # STEP 2: Check if the tool exists in our registry
    # If the LLM hallucinates a tool name that doesn't exist, we reject it right away.
    # -------------------------------------------------------------
    if tool_name not in TOOLS:
        return False, f"Unknown tool '{tool_name}'."

    tool_def = TOOLS[tool_name]

    # -------------------------------------------------------------
    # STEP 3: Check if the user's role is allowed to use this tool
    # Example: 'send_mock_email' is allowed for support_agent and admin, but NOT customer.
    # -------------------------------------------------------------
    if user_role not in tool_def["allowed_roles"]:
        return False, f"Role '{user_role}' is not authorized to execute tool '{tool_name}'."

    # -------------------------------------------------------------
    # STEP 4: Enforce Resource Ownership (Tenant Isolation) for Customers
    # A customer should NEVER see or edit another customer's data!
    # -------------------------------------------------------------
    if user_role == "customer":
        # Rule 4A: Customers cannot send emails (extra safeguard)
        if tool_name == "send_mock_email":
            return False, "Customer role is strictly forbidden from dispatching emails."

        # Rule 4B: Customers can only look up their OWN account
        # If user CUST-1001 tries to look up CUST-1002, block it!
        if tool_name == "lookup_customer":
            target_customer = raw_args.get("customer_id")
            if target_customer and target_customer != current_user_id:
                return (
                    False,
                    f"Access Denied: Customer '{current_user_id}' cannot lookup data for '{target_customer}'."
                )

        # Rule 4C: Customers can only create support tickets for themselves
        if tool_name == "create_ticket":
            target_customer = raw_args.get("customer_id")
            if target_customer and target_customer != current_user_id:
                return (
                    False,
                    f"Access Denied: Customer '{current_user_id}' cannot create a ticket for '{target_customer}'."
                )

    # -------------------------------------------------------------
    # STEP 5: Permission Granted!
    # Support agents and admins have broader access across customer records.
    # -------------------------------------------------------------
    return True, None
