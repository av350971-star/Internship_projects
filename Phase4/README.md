# Tool-Calling Operations Assistant

A production-grade, secure **Tool-Calling Operations Assistant** built from scratch in Python (FastAPI, Pydantic, SQLite) and React (Vite, Vanilla CSS).

> **Core Security Principle:**  
> **The LLM is NOT a trusted security boundary.**  
> The LLM can *request* a tool call, but the application deterministically decides whether that tool call is valid, authorized, approved, and allowed to execute.

---

## 💡 How This Works (Simple Explanation for Beginners)

Imagine the AI assistant is an office clerk who wants to access company records or take actions:
1. **The AI cannot touch anything directly**: When a user asks a question (e.g. *"What is my order status?"*), the AI can only *ask* the backend system to run a tool.
2. **The 8-Step Security Pipeline**: Before any tool runs, the system checks:
   - Does this tool exist in our registry?
   - Is the user allowed to run it? (**RBAC Authorization** — e.g. customers can't send emails or read other users' orders).
   - Do the arguments match our strict data rules? (**Pydantic Validation** — checks types and regex patterns).
   - Does the action change database records or send messages? If yes, it **strictly pauses and asks a human to click Approve** (**Approval Gate**).
   - Only after all checks pass does the tool execute, and every action is logged with millisecond timings (**Audit Log**).
3. **The 5 Tools Available**:
   - `search_knowledge` *(Read-only)*: Searches company refund, return, and warranty documentation.
   - `calculator` *(Read-only)*: Solves math expressions safely using an AST parser (no unsafe Python `eval()`).
   - `lookup_customer` *(Read-only)*: Queries customer orders from SQLite (customers can only see their own ID).
   - `create_ticket` *(Side-effect)*: Creates a support ticket in SQLite (strictly requires human approval).
   - `send_mock_email` *(Side-effect)*: Simulates sending an email (strictly requires human approval; forbidden for customers).

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Architecture & Execution Pipeline](#2-architecture--execution-pipeline)
3. [The Five Operations Tools](#3-the-five-operations-tools)
4. [Pydantic & JSON Schema Validation](#4-pydantic--json-schema-validation)
5. [Role-Based Access Control (RBAC)](#5-role-based-access-control-rbac)
6. [Human-in-the-Loop Approval Workflow](#6-human-in-the-loop-approval-workflow)
7. [Structured Final Output (Order Support Summary)](#7-structured-final-output-order-support-summary)
8. [Execution Logging & Audit Trail](#8-execution-logging--audit-trail)
9. [Security Model](#9-security-model)
10. [Example Workflows](#10-example-workflows)
11. [Testing Observations & Limitations](#11-testing-observations--limitations)
12. [Environment Variables](#12-environment-variables)
13. [Quickstart Guide](#13-quickstart-guide)

---

## 1. Project Overview

Modern AI assistants frequently interact with external tools, APIs, and databases. However, directly executing functions requested by an LLM poses severe security vulnerabilities:
- Parameter injection and type confusion
- Privilege escalation (e.g. customers reading other users' private orders)
- Uncontrolled state mutations (e.g. creating tickets or sending emails without consent)
- Arbitrary code execution (e.g. unsafe Python `eval()` in mathematical tools)

This project demonstrates the internal mechanics of a **secure tool-calling runtime** without relying on third-party agent wrappers (such as LangChain or AutoGen). It implements:
- OpenAI-compatible function calling schemas
- AST-based mathematical evaluation (zero `eval()`)
- Parameterized SQLite queries
- Pydantic v2 strict input validation
- Backend role-based authorization (RBAC)
- Human approval gating for side-effect operations
- Comprehensive execution audit logging with millisecond elapsed timings
- Structured output synthesis (`OrderSupportSummary`)

---

## 2. Architecture & Execution Pipeline

```text
                    ┌─────────────────────┐
                    │        User         │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │    LLM / Planner    │
                    │                     │
                    │ Decide whether tool │
                    │ is required         │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │    Tool Router      │
                    └──────────┬──────────┘
                               ↓
              ┌────────────────────────────────┐
              │      Authorization Layer       │
              │                                │
              │ Is this role allowed to use    │
              │ this tool?                     │
              └───────────────┬────────────────┘
                              ↓
              ┌────────────────────────────────┐
              │      Pydantic Validation       │
              │                                │
              │ Validate every tool argument   │
              └───────────────┬────────────────┘
                              ↓
                 ┌─────────────────────────┐
                 │   Side Effect Check     │
                 │                         │
                 │ Is approval required?   │
                 └────────────┬────────────┘
                              ↓
                       ┌─────────────┐
                       │   Approval  │
                       │   Required? │
                       └──────┬──────┘
                              ↓
                    ┌─────────────────────┐
                    │   Tool Executor     │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ Execution Log       │
                    │                     │
                    │ tool                │
                    │ validated args      │
                    │ result/error        │
                    │ elapsed time        │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ Structured Response │
                    └─────────────────────┘
```

### The Strict 8-Step Pipeline (`services/tool_executor.py`)

Every tool request follows this sequence:
1. **Tool Existence Check**: Verifies the tool is registered in the centralized `TOOLS` registry.
2. **Authorization Layer (`authorize()`)**: Evaluates role permissions and enforces resource tenancy (customers can only access their own records).
3. **Pydantic Validation**: Validates raw input against the tool's Pydantic model (`schema.model_validate(raw_args)`).
4. **Side Effect Check**: Determines whether the tool mutates state.
5. **Approval Enforcement**: If the tool requires approval and has not been approved by a human operator, execution **halts immediately** and creates a pending approval record.
6. **Tool Execution**: Only runs after passing steps 1–5.
7. **Execution Audit Logging**: Records execution ID, timestamp, user context, raw arguments, validated arguments, validation status, authorization outcome, approval state, result/error, and elapsed time in milliseconds. Sanitizes sensitive keys.
8. **Structured Result Return**: Standardized payload returned to the orchestration loop.

---

## 3. The Five Operations Tools

| Tool Name | Type | Requires Approval | Allowed Roles | Data Source |
| :--- | :--- | :--- | :--- | :--- |
| `search_knowledge` | Read-only | No | `customer`, `support_agent`, `admin` | `data/knowledge_base.json` |
| `calculator` | Read-only | No | `customer`, `support_agent`, `admin` | Safe Python AST evaluator |
| `lookup_customer` | Read-only | No | `customer` (self only), `support_agent`, `admin` | `data/operations.db` (SQLite) |
| `create_ticket` | **Side Effect** | **Yes** | `customer` (self only), `support_agent`, `admin` | `data/operations.db` (SQLite) |
| `send_mock_email` | **Side Effect** | **Yes** | `support_agent`, `admin` (`customer` **forbidden**) | `data/mock_emails.json` |

### Tool 1 — `search_knowledge`
Read-only semantic/keyword search over local documentation.
```python
class SearchKnowledgeInput(BaseModel):
    query: str = Field(min_length=2, max_length=500)
    category: Optional[str] = None
    limit: int = Field(default=5, ge=1, le=10)
```

### Tool 2 — `calculator`
Safe arithmetic parser built with Python's `ast` module. Strictly accepts:
- Binary operations: `+`, `-`, `*`, `/`, `%`, `**`
- Unary operations: `+x`, `-x`
- Numbers: integers and floats
- Parentheses: `( ... )`

**Strictly Rejects:**
- `eval()`, `exec()`, `import`
- Function calls: `open()`, `system()`, `sum()`
- Attribute access: `x.__class__`, `os.path`
- Division by zero

### Tool 3 — `lookup_customer`
Reads customer profiles and orders from `data/operations.db` using parameterized SQL queries (`?` placeholder).
```python
class LookupCustomerInput(BaseModel):
    customer_id: str = Field(pattern=r"^CUST-[0-9]{4,8}$")
    include_orders: bool = False
```

### Tool 4 — `create_ticket` (Side Effect)
Creates support tickets in `data/operations.db`. **Never executes immediately.** Always halts and awaits human approval.
```python
class CreateTicketInput(BaseModel):
    customer_id: str = Field(pattern=r"^CUST-[0-9]{4,8}$")
    subject: str = Field(min_length=3, max_length=150)
    description: str = Field(min_length=10, max_length=2000)
    priority: Literal["low", "medium", "high"] = "medium"
```

### Tool 5 — `send_mock_email` (Side Effect)
Simulates dispatching emails by appending records to `data/mock_emails.json`. Labeled with `MOCK EMAIL - SIMULATION ONLY`. **Never sends real emails.**
```python
class SendMockEmailInput(BaseModel):
    to: EmailStr
    subject: str = Field(min_length=3, max_length=150)
    body: str = Field(min_length=1, max_length=5000)
```

---

## 4. Pydantic & JSON Schema Validation

Every tool defines a Pydantic v2 model with `extra="forbid"`.
When arguments violate type bounds or regex patterns:
1. Validation fails before execution.
2. The error response formats field paths cleanly (e.g. `customer_id: String should match pattern '^CUST-[0-9]{4,8}$'`).
3. The execution log marks `validation_status: "FAILED"`.
4. The tool handler never executes.

Public schemas are exposed via:
```http
GET /api/tools
```

---

## 5. Role-Based Access Control (RBAC)

The authorization layer (`services/authorization.py`) independently enforces permissions before tool invocation:

- **Customer**:
  - Allowed: `search_knowledge`, `calculator`
  - Allowed: `lookup_customer` (only when `customer_id == current_user_id`)
  - Allowed: `create_ticket` (only for self)
  - **Forbidden**: `send_mock_email` (instant `TOOL_NOT_AUTHORIZED`)
  - **Forbidden**: Querying or creating tickets for other customers
- **Support Agent**:
  - Allowed: `search_knowledge`, `calculator`, `lookup_customer` (any customer), `create_ticket`, `send_mock_email`
- **Administrator**:
  - Allowed: All tools and resources across all customers

*Note: Frontend role selection is never trusted blindly; the backend enforces strict role whitelisting (`customer`, `support_agent`, `admin`).*

---

## 6. Human-in-the-Loop Approval Workflow

When a side-effect tool (`create_ticket` or `send_mock_email`) is requested:
1. Arguments are validated and role permissions verified.
2. The orchestrator halts execution and creates an approval record:
   ```json
   {
     "approval_id": "APR-51749",
     "tool": "create_ticket",
     "user_role": "customer",
     "arguments": {
       "customer_id": "CUST-1001",
       "subject": "Order delayed",
       "description": "Package has not arrived",
       "priority": "medium"
     },
     "status": "pending"
   }
   ```
3. The UI presents an interactive approval card with `[Approve & Execute]` and `[Reject Action]` buttons.
4. Calling `POST /api/approvals/{id}/approve` triggers execution with the approved authorization token.
5. Calling `POST /api/approvals/{id}/reject` cancels execution and records rejection in the audit log.

---

## 7. Structured Final Output (Order Support Summary)

For complex multi-turn queries like:
> *"Check customer CUST-1001's orders and calculate the total order amount."*

The orchestrator chains `lookup_customer` and `calculator`, returning both natural language and a validated Pydantic model:

```json
{
  "workflow": "order_support_summary",
  "customer_id": "CUST-1001",
  "orders_found": 2,
  "total_amount": 2450.0,
  "currency": "INR",
  "tools_used": [
    "lookup_customer",
    "calculator"
  ],
  "status": "completed"
}
```

Response Model:
```python
class OrderSupportSummary(BaseModel):
    workflow: str
    customer_id: str
    orders_found: int
    total_amount: float
    currency: str
    tools_used: List[str]
    status: Literal["completed", "failed"]
```

---

## 8. Execution Logging & Audit Trail

Every attempted tool call generates an immutable audit record:

```json
{
  "execution_id": "EXEC-37427",
  "timestamp": "2026-09-16T12:47:35.120Z",
  "user_id": "CUST-1001",
  "role": "customer",
  "tool": "lookup_customer",
  "raw_arguments": {
    "customer_id": "CUST-1001",
    "include_orders": true
  },
  "validated_arguments": {
    "customer_id": "CUST-1001",
    "include_orders": true
  },
  "validation_status": "PASSED",
  "authorization": {
    "allowed": true,
    "reason": null
  },
  "approval": {
    "required": false,
    "status": "not_required"
  },
  "result": {
    "found": true,
    "orders_count": 2
  },
  "error": null,
  "elapsed_ms": 1.25
}
```

### Sanitization Policy:
- Sensitive parameters (`api_key`, `secret`, `password`, `token`, `system_prompt`) are redacted as `[REDACTED]`.
- No stack traces or hidden chain-of-thought are persisted.

---

## 9. Security Model

```text
                     Untrusted Input
                           │
                           ▼
                  ┌─────────────────┐
                  │       LLM       │
                  │  (Untrusted)    │
                  └────────┬────────┘
                           │ Requests tool call + arguments
                           ▼
                  ┌─────────────────┐
                  │ Tool Registry   │  <-- Rejects unregistered tools
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  Authorization  │  <-- Rejects unauthorized roles & tenant violations
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Pydantic Schema │  <-- Rejects invalid types, malformed strings, injections
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  Approval Gate  │  <-- Blocks unauthorized side-effects without human token
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  Safe Executor  │  <-- Parameterized SQL, AST Math, Sandboxed FS
                  └─────────────────┘
```

---

## 10. Example Workflows

### Workflow 1: Knowledge Search
- **User Prompt**: *"What is our refund policy?"*
- **Role**: `customer`
- **Tool Triggered**: `search_knowledge(query="refund policy", limit=3)`
- **Validation**: `PASSED`
- **Authorization**: `ALLOWED`
- **Approval**: `NOT REQUIRED`
- **Result**: Summary of 30-day refund timeline and conditions.

### Workflow 2: Safe Arithmetic
- **User Prompt**: *"What is 250 * 4 + 100?"*
- **Role**: `customer`
- **Tool Triggered**: `calculator(expression="250 * 4 + 100")`
- **Validation**: `PASSED`
- **Result**: `1100`

### Workflow 3: Customer Lookup & Tenant Isolation
- **User Prompt (Self)**: *"Look up customer CUST-1001 with orders."* (Role: Customer `CUST-1001`)
  - **Tool**: `lookup_customer(customer_id="CUST-1001", include_orders=True)`
  - **Result**: Returns 2 orders totaling 2450.0 INR.
- **User Prompt (Other)**: *"Look up customer CUST-1002."* (Role: Customer `CUST-1001`)
  - **Authorization**: `DENIED` (`Access Denied: Customer 'CUST-1001' cannot lookup data for 'CUST-1002'.`)
  - **Execution**: Tool handler **never** executed.

### Workflow 4: Ticket Creation with Human Approval
- **User Prompt**: *"Create a ticket because my order has not arrived and is delayed."*
- **Tool**: `create_ticket`
- **Execution**: Halts immediately with status `AWAITING_USER_APPROVAL` (Approval ID: `APR-XXXXX`).
- **User Action**: Clicks `[Approve & Execute]`.
- **Final Result**: Ticket created with ID `TCK-XXXX` and persisted to SQLite table `tickets`.

### Workflow 5: Order Support Summary Workflow
- **User Prompt**: *"Check customer CUST-1001's orders and calculate the total order amount."*
- **Multi-turn Tools**: `lookup_customer` $\rightarrow$ `calculator`
- **Final Output**: Synthesizes conversational answer and returns structured `OrderSupportSummary`.

---

## 11. Testing Observations & Limitations

During extensive automated testing (51 unit, integration, security, and schema tests) and end-to-end evaluations, the following key observations and limitations were documented:

1. **Multi-Turn Session Leakage**: When chaining multi-turn workflows (e.g. `lookup_customer` $\rightarrow$ `calculator`), conversational history across distinct user questions must be scoped to the *current user turn*. Otherwise, tools executed in previous turns (like an earlier calculator query) can inadvertently satisfy subsequent tool requirements.
2. **AST Exponentiation DOS Prevention**: A safe arithmetic AST evaluator must guard against computational denial-of-service such as `999999 ** 999999`. The implementation enforces power and magnitude bounds (`abs(base) <= 10000`, `exponent <= 100`).
3. **Regex Pattern Nuances for Customer Identifiers**: Regex patterns for IDs must enforce strict start-and-end anchors (`^CUST-[0-9]{4,8}$`) to prevent trailing or prepended injection strings from passing through validation.
4. **Approval State Persistence vs Memory**: In high-throughput production environments, pending approval tokens should be backed by Redis or an ACID database with expiration timeouts (TTL), rather than solely in-memory dicts, to survive server restarts across horizontally scaled replicas.
5. **LLM Tool Choice Loop Termination**: LLMs can occasionally oscillate in repetitive tool calls if a tool returns an expected empty result (e.g. 0 articles found). Enforcing `MAX_TOOL_CALLS = 5` is an essential operational circuit-breaker.

---

## 12. Environment Variables

Create `backend/.env` based on `backend/.env.example`:

```env
# Optional external OpenAI / Gemini / Ollama endpoint:
BASE_URL=https://api.openai.com/v1
API_KEY=
MODEL=gpt-4o-mini
TEMPERATURE=0.2
MAX_TOOL_CALLS=5
```

*Note: If `API_KEY` is omitted, the assistant seamlessly runs the deterministic internal semantic planner, enabling 100% functionality offline and for automated CI tests without external API dependencies.*

---

## 13. Quickstart Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
# Navigate to backend
cd backend

# Install Python requirements
pip install -r requirements.txt

# Initialize and seed the SQLite database
python data/db_init.py

# Run all 51 automated tests
pytest tests -v

# Start FastAPI server (runs on port 8000)
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup
```bash
# In a separate terminal, navigate to frontend
cd frontend

# Install npm dependencies
npm install

# Start Vite dev server (runs on port 5173 with proxy to port 8000)
npm run dev
```

### 4. Access the Dashboard
Open your browser to:
```text
http://127.0.0.1:5173
```
You can switch roles, click the quick prompt pills, review live execution logs, and inspect SQLite database tables and mock emails in real time.
