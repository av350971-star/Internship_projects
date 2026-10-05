"""
Centralized Tool Registry for Operations Assistant.
Single source of truth for tool definitions, Pydantic schemas, side-effect attributes,
and role-based permissions.
"""
from typing import Any, Callable, Dict, List, Type
from pydantic import BaseModel

from tools.search_knowledge import search_knowledge
from tools.calculator import calculator
from tools.lookup_customer import lookup_customer
from tools.create_ticket import create_ticket
from tools.send_mock_email import send_mock_email

from models.tool_models import (
    SearchKnowledgeInput,
    CalculatorInput,
    LookupCustomerInput,
    CreateTicketInput,
    SendMockEmailInput
)

# Central Tool Registry
TOOLS: Dict[str, Dict[str, Any]] = {
    "search_knowledge": {
        "handler": search_knowledge,
        "schema": SearchKnowledgeInput,
        "side_effect": False,
        "requires_approval": False,
        "allowed_roles": ["customer", "support_agent", "admin"],
        "description": "Read-only search over company policies, refunds, shipping, warranty, and documentation."
    },
    "calculator": {
        "handler": calculator,
        "schema": CalculatorInput,
        "side_effect": False,
        "requires_approval": False,
        "allowed_roles": ["customer", "support_agent", "admin"],
        "description": "Perform safe mathematical and arithmetic calculations (+, -, *, /, parentheses)."
    },
    "lookup_customer": {
        "handler": lookup_customer,
        "schema": LookupCustomerInput,
        "side_effect": False,
        "requires_approval": False,
        "allowed_roles": ["customer", "support_agent", "admin"],
        "description": "Look up customer account details and order history from the operations database."
    },
    "create_ticket": {
        "handler": create_ticket,
        "schema": CreateTicketInput,
        "side_effect": True,
        "requires_approval": True,
        "allowed_roles": ["customer", "support_agent", "admin"],
        "description": "Create a new support ticket. Mutates system state and requires human approval."
    },
    "send_mock_email": {
        "handler": send_mock_email,
        "schema": SendMockEmailInput,
        "side_effect": True,
        "requires_approval": True,
        "allowed_roles": ["support_agent", "admin"],
        "description": "Simulate sending a customer email notice. Mutates state and requires human approval."
    }
}


def get_tool(tool_name: str) -> Dict[str, Any]:
    """Retrieve metadata and handler for a tool, or raise KeyError."""
    if tool_name not in TOOLS:
        raise KeyError(f"Tool '{tool_name}' is not registered in the system.")
    return TOOLS[tool_name]


def get_tools_metadata() -> List[Dict[str, Any]]:
    """
    Returns public metadata and full JSON Schema for all registered tools.
    Exposed via GET /api/tools.
    """
    metadata_list = []
    for name, tool_def in TOOLS.items():
        schema_cls: Type[BaseModel] = tool_def["schema"]
        json_schema = schema_cls.model_json_schema()

        metadata_list.append({
            "name": name,
            "description": tool_def["description"],
            "side_effect": tool_def["side_effect"],
            "requires_approval": tool_def["requires_approval"],
            "allowed_roles": tool_def["allowed_roles"],
            "input_schema": json_schema
        })
    return metadata_list


def get_openai_tools_schema(allowed_roles_filter: List[str] = None) -> List[Dict[str, Any]]:
    """
    Formats registered tools into standard OpenAI-compatible tool definitions.
    Optionally filters by the current user's role.
    """
    openai_tools = []
    for name, tool_def in TOOLS.items():
        if allowed_roles_filter:
            # If specified, only include tools permitted for these roles
            if not any(r in tool_def["allowed_roles"] for r in allowed_roles_filter):
                continue

        schema_cls: Type[BaseModel] = tool_def["schema"]
        json_schema = schema_cls.model_json_schema()

        # Clean JSON schema for OpenAI tool parameter format
        parameters = {
            "type": "object",
            "properties": json_schema.get("properties", {}),
            "required": json_schema.get("required", [])
        }

        openai_tools.append({
            "type": "function",
            "function": {
                "name": name,
                "description": tool_def["description"],
                "parameters": parameters
            }
        })
    return openai_tools
