"""
Pydantic input models and schemas for the 5 tools.
Strict validation is applied to every tool invocation argument.
"""
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class SearchKnowledgeInput(BaseModel):
    """Input model for the search_knowledge tool."""
    model_config = ConfigDict(extra="forbid")

    query: str = Field(
        ...,
        min_length=2,
        max_length=500,
        description="Search query string to search within knowledge base articles."
    )
    category: Optional[str] = Field(
        default=None,
        description="Optional category filter (e.g., 'billing', 'shipping', 'returns', 'support', 'security')."
    )
    limit: int = Field(
        default=5,
        ge=1,
        le=10,
        description="Maximum number of relevant articles to return."
    )


class CalculatorInput(BaseModel):
    """Input model for the safe calculator tool."""
    model_config = ConfigDict(extra="forbid")

    expression: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Arithmetic expression containing numbers and operators (+, -, *, /, parentheses)."
    )


class LookupCustomerInput(BaseModel):
    """Input model for looking up customer and order details."""
    model_config = ConfigDict(extra="forbid")

    customer_id: str = Field(
        ...,
        pattern=r"^CUST-[0-9]{4,8}$",
        description="Customer identifier formatted as CUST- followed by 4 to 8 digits (e.g., CUST-1001)."
    )
    include_orders: bool = Field(
        default=False,
        description="If True, also queries and returns customer's order history."
    )


class CreateTicketInput(BaseModel):
    """Input model for creating a customer support ticket (Side-effect tool)."""
    model_config = ConfigDict(extra="forbid")

    customer_id: str = Field(
        ...,
        pattern=r"^CUST-[0-9]{4,8}$",
        description="Customer ID for whom the ticket is being created."
    )
    subject: str = Field(
        ...,
        min_length=3,
        max_length=150,
        description="Concise summary of the support issue."
    )
    description: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="Detailed description of the customer problem or request."
    )
    priority: Literal["low", "medium", "high"] = Field(
        default="medium",
        description="Ticket urgency level: 'low', 'medium', or 'high'."
    )


class SendMockEmailInput(BaseModel):
    """Input model for simulating email dispatch (Side-effect tool)."""
    model_config = ConfigDict(extra="forbid")

    to: EmailStr = Field(
        ...,
        description="Recipient valid email address (e.g., user@example.com)."
    )
    subject: str = Field(
        ...,
        min_length=3,
        max_length=150,
        description="Email subject line."
    )
    body: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Email message body content."
    )
