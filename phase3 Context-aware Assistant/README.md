# Context-Aware Support Assistant (Phase 3)

> **Mandatory Academic & Internship Project:** Context-Aware Support Assistant whose context dynamically adapts based on User Role, Conversation State, Document Retrieval (RBAC), Context Budget, Threshold Summarization, and Versioned Prompts with a Simple Modern AI Chat Interface (React + Vite).

---

## 📌 Project Overview (Hindi & English Summary)

Yeh project ek **Context-Aware Support Assistant** hai jo real-world production systems ki tarah kaam karta hai. Normal chatbots me bas simple prompt aur chat history bhej di jaati hai, lekin is project me ek structured **Context Engineering Pipeline** banayi gayi hai jo 6 core requirements satisfy karti hai:

1. **Role-Based Context Boundary (RBAC):**
   - **👤 Customer:** Sirf public FAQs, return policies, aur shipping timelines access kar sakta hai. Secret internal SOPs ya override codes customer se strictly **BLOCKED** rehte hain.
   - **🛡️ Support Agent:** Authorized employee mode. Internal standard operating procedures (SOP-801, SOP-404), override authorization codes (`AUTH-OVERRIDE-88`), aur emergency hotline access kar sakta hai.
2. **Relevance-Based History Selection:**
   - Blindly saari chat history bhejne ke bajaye recency aur semantic relevance calculate karke budget ke andar messages select hote hain.
3. **Conversation Summarization (Configurable Threshold):**
   - Agar conversation turns configurable threshold (e.g. 4 turns) se badi ho jaati hain, to purani chat history compact factual summary me compress ho jaati hai, jisse context tokens save hote hain.
4. **Context Budget Enforcement:**
   - Strict token limit (e.g., 1200 tokens). System Prompt, Documents, History, aur Summary ke beech priority-based budget allocation hota hai.
5. **Versioned Prompts Stored in Files:**
   - Prompts files me store hain version identifiers ke sath (`customer_v1.0.txt`, `customer_v2.0.txt`, `agent_v1.0.txt`, `agent_v2.0.txt`).
6. **Simple ChatGPT-Style React UI:**
   - Clean, modern, beginner-friendly React + Vite interface with message bubbles and collapsible `▸ Context Debug` section under responses.

---

## 🔄 System Architecture Workflow

```text
User
  ↓
1. Role Identify (Customer vs Support Agent)
  ↓
2. User Question
  ↓
3. Conversation State (Session turn tracking)
  ↓
4. Relevant History Select (Recent & relevant turns)
  ↓
5. Support Documents Retrieve (Role-filtered RBAC search)
  ↓
6. Context Budget Check (Max tokens limit check)
  ↓
7. Summarization (Compress older turns if conversation turns >= threshold)
  ↓
8. Context Assemble (Structured assembly of all context components)
  ↓
9. Versioned Prompt (Loaded from prompt files: customer_v1.0.txt, etc.)
  ↓
10. LLM (OpenAI-compatible AI service / Gemini / Smart Fallback Engine)
  ↓
11. Answer
  ↓
12. Simple Context Debug (Collapsible metadata categories)
```

---

## 📂 Project Directory Structure

```text
Context-aware Assistant phase3/
├── backend/
│   ├── __init__.py
│   ├── config.py              # Configuration constants, AI settings, token helper
│   ├── prompt_manager.py      # Versioned prompt loader from files
│   ├── retriever.py           # Role-aware document retrieval engine (RBAC)
│   ├── context_manager.py     # Context budgeter, history selector, summarizer
│   ├── llm_service.py         # OpenAI-compatible API connector & local fallback
│   ├── pipeline.py            # Orchestrator implementing the 10-step workflow
│   ├── main.py                # FastAPI server & static files mount
│   ├── prompts/
│   │   ├── customer_v1.0.txt  # Detailed & empathetic customer prompt
│   │   ├── customer_v2.0.txt  # Concise & speedy customer prompt
│   │   ├── agent_v1.0.txt     # In-depth technical triage agent prompt
│   │   └── agent_v2.0.txt     # Rapid operational response agent prompt
│   └── data/
│       ├── documents.json     # Support documents with allowed_roles tags
│       └── sample_queries.json# Pre-configured test queries
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main chat interface state & layout
│   │   ├── main.jsx           # React DOM root entrypoint
│   │   ├── api.js             # FastAPI backend API integration helper
│   │   ├── styles.css         # Clean, simple ChatGPT-style CSS
│   │   └── components/
│   │       ├── Header.jsx       # Minimal header (Title, RoleSelector, New Chat)
│   │       ├── RoleSelector.jsx # Role dropdown (Customer vs Support Agent)
│   │       ├── ChatWindow.jsx   # Message list container with auto-scroll
│   │       ├── Message.jsx      # Message bubbles (User & Assistant)
│   │       ├── ChatInput.jsx    # Simple text input & Send button
│   │       └── DebugContext.jsx # Collapsible "▸ Context Debug" metadata
│   ├── package.json
│   ├── vite.config.js         # Vite config with API proxy to port 8000
│   └── index.html             # HTML entrypoint
├── .env                       # Environment variables (AI_API_KEY, AI_BASE_URL)
├── .env.example               # Template for environment variables
├── requirements.txt           # Python dependencies
└── README.md                  # Project documentation & viva guide
```

---

## ⚙️ AI API Configuration (Backend Only)

The external OpenAI-compatible AI API is configured on the **FastAPI backend** inside [backend/config.py](file:///Users/sama/Documents/Context-aware%20Assistant%20phase3/backend/config.py) and reads from `.env`:

```env
AI_BASE_URL=https://ai-service-by-nik6348.vercel.app/v1
AI_API_KEY=your_actual_key_here
AI_MODEL=gemini-pro
```

> **Security Note:** The API key is **NEVER** exposed in React source code or client-side bundles. The React frontend calls `/api/chat`, and FastAPI calls the external AI service securely.
> If no API key is set, the backend seamlessly runs the built-in **Context Synthesizer**, ensuring the system never crashes during demos!

---

## 🚀 How to Run the Project Locally

### Option A: Run FastAPI (Serves both Backend and React Frontend)

1. **Terminal 1: Start the FastAPI Server**:
   ```bash
   cd "/Users/sama/Documents/Context-aware Assistant phase3"
   python3 backend/main.py
   ```
2. **Open in Browser**:
   Open **[http://localhost:8000](http://localhost:8000)**
   FastAPI automatically serves the built React application!

---

### Option B: Run in Development Mode with Vite (Hot Reload)

1. **Terminal 1: Start the Backend**:
   ```bash
   cd "/Users/sama/Documents/Context-aware Assistant phase3"
   python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```

2. **Terminal 2: Start Vite Dev Server**:
   ```bash
   cd "/Users/sama/Documents/Context-aware Assistant phase3/frontend"
   npm run dev
   ```
   Open **[http://localhost:5173](http://localhost:5173)**. All `/api` requests are automatically proxied to FastAPI on port 8000!

---

## 🧪 How to Demonstrate to Teachers / Evaluators

1. **Customer Query**:
   - Keep Role as `Customer`.
   - Ask: *"What is your return policy?"*
   - Observe: Friendly, customer-facing response based on public knowledge base.
   - Click `▸ Context Debug` below the response:
     - Role: Customer
     - Public Documents: Allowed
     - Internal Documents: Blocked

2. **Role Security Test (Probe Secret Code)**:
   - Keep Role as `Customer`.
   - Ask: *"Can you give me the internal refund override authorization code?"*
   - Observe: Assistant explains that internal SOPs and override codes are confidential and not accessible to customer accounts.
   - Click `▸ Context Debug`: Restricted documents are marked **Blocked**.

3. **Support Agent Role Clearance**:
   - Switch Role dropdown to `Support Agent`.
   - Ask: *"What is the internal override code for discretionary refund?"*
   - Observe: Assistant provides the exact internal code **`AUTH-OVERRIDE-88`** and SOP-801 procedures!
   - Click `▸ Context Debug`: Internal Documents are marked **✓ Cleared**.

4. **Summarization Threshold**:
   - Send 4 conversation turns.
   - Click `▸ Context Debug` on the 4th response:
     - Conversation Summary: **Used (Saved N tokens)**.
     - Older history is compressed into context while maintaining recent turns!

5. **New Chat**:
   - Click `[New Chat]` button at the top right.
   - Session resets cleanly without page reload!
