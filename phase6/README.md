# Personalized Assistant with Controlled Memory

A production-grade implementation demonstrating how an AI assistant can maintain personalization across sessions while preventing uncontrolled long-term data retention.

The core architecture strictly separates ephemeral short-term session state from curated long-term memory, enforcing dual-gate relevance & confidence scoring, context budget constraints, conflict resolution, and an application-level append-only audit trail.

```text
Short-Term Session State ≠ Long-Term Memory
```

---

## 1. Project Overview

Modern LLM assistants frequently suffer from either **amnesia** (forgetting user context upon session end) or **uncontrolled retention** (blindly stuffing entire conversation histories or unverified memories into model context).

This system demonstrates that personalization can be maintained without compromising data governance or context efficiency.

```text
User Message
     ↓
Current Session State (ephemeral messages & task)
     ↓
Memory Retrieval (candidate search in user-scoped store)
     ↓
Relevance Scoring (lexical overlap + synonym normalization + domain affinity)
     ↓
Dual-Gate Filtering (Relevance final_score ≥ 0.60 & Confidence ≥ 0.70)
     ↓
Conflict Resolution Guard (opposing instructions filtered; newest takes precedence)
     ↓
Context Budgeting (max 5 items, 1200 chars cap)
     ↓
Context Builder (SYSTEM + SESSION + VERIFIED MEMORIES + USER)
     ↓
LLM Execution (external API or intelligent memory-aware generator)
     ↓
Response Generation
     ↓
Controlled Memory Extraction (Explicit triggers vs transient rejection)
     ↓
Audit Trail (retrieved, injected, rejected, created, updated, deleted)
```

---

## 2. Short-Term vs. Long-Term Memory

| Dimension | Short-Term Session State | Long-Term Memory Store |
| :--- | :--- | :--- |
| **Storage Location** | `data/sessions.db` (ephemeral SQLite table) | `data/memory.db` (`memories` table) |
| **Scope** | Current conversation turn & active task | Persistent across all user sessions |
| **Contents** | Raw messages, temporary variables, topic cues | Curated semantic, episodic, preference, and procedural records |
| **Session Reset** | **Wiped immediately** (`messages = []`) | **100% Preserved intact** |
| **LLM Injection** | Direct recent conversation turns | Injected only if relevant, confident, conflict-free & budgeted |
| **User Control** | Cleared via "Reset Session" button | User-visible list: create, edit, soft delete, filter, and audit |

---

## 3. Four Memory Categories

The system supports four distinct, clearly separated memory categories:

### A. Semantic Memory
*Answers:* **"What stable facts are known about the user?"**
- Persistent facts regarding user skillset, tools, background, or domain.
- *Examples:*
  - `"User is learning Python"`
  - `"User works as a software developer"`
  - `"User builds full-stack React applications"`

### B. Episodic Memory
*Answers:* **"What specific past events or interactions occurred?"**
- Specific past milestones, completed projects, or previously discussed bugs.
- *Examples:*
  - `"User previously completed the LLM Playground project"`
  - `"User discussed an SQLite database lock bug in an earlier session"`
  - `"User previously worked on Docker deployment configurations"`

### C. Preference Memory
*Answers:* **"What does the user like, dislike, or prefer?"**
- Personal stylistic tastes, tone, format, or UI preferences.
- *Examples:*
  - `"User prefers concise answers"`
  - `"User prefers detailed responses"`
  - `"User prefers dark mode UI styling"`

### D. Procedural Memory
*Answers:* **"HOW should the assistant perform tasks for the user?"**
- Explicit behavioral workflows, code formatting instructions, and execution patterns.
- *Examples:*
  - `"Explain programming concepts step-by-step."`
  - `"When giving code, include a short explanation before the code."`
  - `"For project debugging, first identify the error and then provide the fix."`
  - `"When generating APIs, provide endpoint examples."`

---

## 4. Controlled Memory Retention & Lifecycle

Uncontrolled retention is prevented by strict memory extraction and candidate rules:

### A. Explicit Memory Creation (High Confidence: 0.95–0.98)
Triggered when the user issues direct memory directives:
- `"remember this"`, `"save this"`, `"keep this in mind"`, `"don't forget this"`
- `"from now on"`, `"always do this"`, `"my preference is..."`
- Explicit commands bypass candidate ambiguity and save directly with verified confidence.

### B. Inferred Memory Filtering
Only durable facts and stable instructions are eligible for inferred extraction.
**Transient statements are strictly rejected (IGNORED):**
- `"I'm building this today"`
- `"I am testing this right now"`
- `"I am currently trying..."`
- `"Just testing this for now"`
- One-off questions, transient task cues, and casual chit-chat are never committed to long-term memory.

---

## 5. Critical Fix: Preference Updates & Conflict Resolution

### The Problem
Previously, editing a preference in the UI could leave stale or opposing preferences active in the system, causing the assistant to receive contradictory guidance (e.g. both "concise answers" and "detailed answers").

### The Complete Solution
1. **In-Place DB Update & Timestamp Refresh**: Editing a memory updates the database record directly and sets `updated_at = UTC timestamp`.
2. **Database Conflict Deactivation**: When a preference or procedural memory is created or updated, `memory_manager.find_conflicting_memories()` identifies opposing instruction clusters (e.g., concise vs. detailed, dark vs. light, step-by-step vs. summary). Any existing active conflicting record is automatically deactivated/soft-deleted.
3. **Context Builder Conflict Guard**: During context assembly, eligible candidates are sorted primarily by `final_score` and secondarily by `updated_at` descending. Any subsequent candidate that conflicts with an already accepted memory is dropped with rejection reason: `"Rejected due to conflicting instruction with accepted memory <id>"`.
4. **Immediate Cross-Session Propagation**: Because session state does not cache long-term memory, subsequent chat turns in both current and new sessions immediately reflect the updated preference.
5. **Full Auditability**: Every update creates an `updated` event in `memory_audit` documenting previous and updated content.

---

## 6. Relevance Scoring & Confidence Gating

### 1. Multi-Factor Scoring Formula
$$\text{final\_score} = (\text{relevance\_score} \times 0.50) + (\text{confidence} \times 0.30) + (\text{importance} \times 0.20)$$

- **`relevance_score`**: Normalized lexical scoring combining Jaccard overlap, memory token coverage, semantic synonym clustering (`explain/answer/response`, `code/programming`, `debug/error`), and domain/task affinity (+0.20 boost for pertinent category cues).
- **`confidence`**: Degree of certainty ($0.95+$ for explicit user instructions, $0.70-0.85$ for inferred facts).
- **`importance`**: User-assigned or inferred priority ($0.0-1.0$).

### 2. Dual-Gate Thresholds
1. **Relevance Gate**: $\text{final\_score} \ge 0.60$
2. **Confidence Gate**: $\text{confidence} \ge 0.70$

If a memory fails either gate, it is rejected, logged in the audit trail with the exact failure reason, and barred from model context.

### 3. Context Budget Constraints
- $\text{MAX\_MEMORIES\_IN\_CONTEXT} = 5$
- $\text{MEMORY\_CONTEXT\_BUDGET} = 1200\text{ characters}$
- Memories exceeding budget are dropped cleanly without prompt truncation.

---

## 7. Audit Trail & Delete Semantics

### Application-Level Append-Only Audit
Every memory lifecycle event is logged to the `memory_audit` table in `data/memory.db`:
- `created`: Memory record committed.
- `updated`: Memory content, importance, or status modified.
- `deleted`: Memory soft-deleted.
- `retrieved`: Candidate memory evaluated for an incoming query.
- `injected`: Eligible memory included in the final model prompt.
- `rejected`: Candidate memory excluded due to relevance, confidence, conflict, or budget limits.

### Soft Delete Semantics
- Deleting a memory sets `status = 'deleted'`.
- Deleted memories are **never** retrieved, scored, or injected into context.
- Audit records for deleted memories are preserved for governance without exposing deleted content to future prompts.

---

## 8. User Isolation & Authentication Architecture

- **User Scoping**: Every database query, session lookup, memory CRUD operation, and audit trail retrieval is strictly scoped by `user_id`.
- **Identity Mechanism**: The application uses the `X-User-ID` HTTP header (defaulting to `USER-1001` in demo mode) for identity scoping.
- **Identity Note**: `X-User-ID` is a demo identity mechanism for multi-tenancy verification and automated tests; it is **not** a cryptographically signed authentication mechanism (such as JWT/OAuth2).
- **Isolation Guarantee**: Tested by `test_user_isolation.py`—`USER-1001` cannot read, edit, delete, or retrieve memories belonging to `USER-1002`.

---

## 9. Running Locally

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
python3 -m pip install -r requirements.txt

# Start FastAPI server (runs on http://127.0.0.1:8000)
python3 main.py
```

### Frontend Setup
```bash
# In a separate terminal, navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server (runs on http://localhost:5173)
npm run dev
```

Visit **http://localhost:5173** to access the application UI.

---

## 10. Automated Tests

Run the complete 18-test automated verification suite:
```bash
cd backend
python3 -m pytest tests -v
```

### Test Suite Breakdown
1. `tests/test_memory_crud.py` (3 tests): CRUD lifecycle, 4 categories (Semantic, Episodic, Preference, Procedural), Pydantic schema validation.
2. `tests/test_retrieval.py` (1 test): Relevance scoring, confidence gating, rejection of low-confidence and irrelevant memories.
3. `tests/test_context.py` (2 tests): Section separation, max memory count limit, 1200-character budget constraint.
4. `tests/test_sessions.py` (1 test): Ephemeral session reset wipes chat turns while preserving long-term memories.
5. `tests/test_audit.py` (1 test): Complete audit event coverage (`created`, `updated`, `deleted`, `retrieved`, `injected`, `rejected`).
6. `tests/test_user_isolation.py` (1 test): Multi-tenant isolation between distinct users.
7. `tests/test_deduplication.py` (1 test): Automatic merging and updating of duplicate memories.
8. `tests/test_cross_session_demo.py` (1 test): Full 5-step cross-session personalization workflow.
9. `tests/test_procedural_memory.py` (4 tests): Procedural memory CRUD, procedural retrieval and injection, transient statement rejection, explicit procedural command extraction.
10. `tests/test_preference_update_behavior.py` (3 tests): Preference update in-place injection lifecycle, opposing preference conflict resolution, cross-session behavioral adaptation.

**Test Status:** 18 passed, 0 failed.

---

## 11. Known Limitations

1. **Retrieval Architecture**: Uses normalized lexical scoring with semantic synonym clusters and domain affinity. While lightweight, local, and SQLite-native, it does not use dense vector embeddings.
2. **Identity Header**: `X-User-ID` provides multi-tenant scoping for testing and demo purposes, but requires integration with an OAuth2/OIDC provider for production authentication.
3. **Audit Storage**: The audit trail is append-only at the application layer; it is not database-level immutable (e.g. SQLite trigger-enforced or cryptographic blockchain ledger).
4. **Heuristic Confidence**: Confidence for inferred statements is estimated based on grammar and linguistic cues; user confirmation in the UI remains the gold standard for long-term memory governance.
