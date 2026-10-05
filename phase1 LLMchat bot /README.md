# ⚡ LLM Playground Chatbot

> **MANDATORY PROJECT** — Build a chat application that exposes the basic, transparent behavior of an LLM instead of hiding it behind complex framework abstractions (such as LangChain or LlamaIndex).

---

## 📑 Table of Contents
1. [Project Overview](#project-overview)
2. [Project Architecture](#project-architecture)
3. [The 7 Core Modules](#the-7-core-modules)
4. [Quickstart & Setup Guide](#quickstart--setup-guide)
5. [Connecting Any LLM Provider](#connecting-any-llm-provider)
6. [Why This App is an AI Assistant, Not an Autonomous Agent](#why-this-app-is-an-ai-assistant-not-an-autonomous-agent)
7. [API Documentation](#api-documentation)

---

## 1. Project Overview

Modern AI development often hides the underlying mechanics of Large Language Models behind high-level orchestration abstractions. While frameworks like LangChain or LlamaIndex have their place, they often make it difficult for students and engineers to understand what is **actually happening over the wire**.

This project provides an educational, transparent, and aesthetically modern **LLM Playground**. It directly exposes:
- The raw **messages array** sent over HTTP to `/chat/completions`.
- The real role of the **System Prompt** at index `0`.
- How **multi-turn context** accumulates turn-by-turn.
- Dynamic hyperparameter control (**Temperature** and **Model Selection**) loaded from configuration.
- Real-time performance telemetry: **Latency (ms)**, **Prompt/Completion Token Counts**, and **Estimated Cost ($ USD)**.
- Full **Session Persistence** and **Conversation Reset**.
- Robust, **graceful error handling** without silent crashes or UI breaks.

---

## 2. Project Architecture

The repository is organized following the exact requirement hierarchy:

```
LLM Playground
│
├── 1. Basic Chat                  -> Direct User <-> Assistant exchange
├── 2. System Prompt               -> Persona & instruction control (role: "system")
├── 3. Multi-turn Conversation     -> History preservation & context accumulation
├── 4. Model + Temperature Config  -> Loaded from backend config, interactive controls
├── 5. Token / Cost / Latency      -> Real-time usage analytics per message & aggregate
├── 6. Sessions + Reset            -> Multiple saved sessions (server-side persistence) + reset
└── 7. Error Handling + README     -> Graceful API error boundary + AI Assistant vs Agent analysis
```

### Directory Structure
```
LLMchat bot phase1/
├── backend/
│   ├── __init__.py
│   ├── config.py          # Supported models, token pricing, environment variables
│   ├── storage.py         # Server-side session persistence in data/sessions.json
│   ├── llm_client.py      # Direct HTTP requests to /chat/completions (via httpx)
│   └── main.py            # FastAPI endpoints, static frontend mounting & Swagger docs
├── data/
│   └── sessions.json      # Persistent conversation sessions (pre-seeded with 2 sessions)
├── frontend/
│   ├── index.html         # Modern single-page playground interface
│   ├── style.css          # Dark-mode aesthetic design system & animations
│   └── app.js             # Client state, dynamic dropdowns, metrics & raw JSON modal
├── tests/
│   └── test_api.py        # Automated test suite verifying all 7 pillars
├── .env.example           # Configuration template
├── .env                   # Local environment file (API keys & Base URL)
├── requirements.txt       # Minimal Python dependencies (FastAPI, Uvicorn, HTTPX)
├── run.py                 # Single-command application launcher
└── README.md              # Project documentation and theoretical analysis
```

---

## 3. The 7 Core Modules

### 1. Basic Chat
- Implements direct prompt-and-response turn taking.
- Input supports multiline typing (`Shift + Enter`), auto-expanding height, and character count.
- Assistant responses support syntax-highlighted code blocks, lists, and formatted text.

### 2. System Prompt
- The System Prompt sets the persona, constraints, and behavioral tone of the model.
- It is sent as `{"role": "system", "content": "..."}` at position `0` of the `messages` array.
- The UI includes pre-built presets:
  - **General Assistant**: Concise and direct helper.
  - **Coding Tutor (BCA/CS)**: Tailored for programming students with step-by-step code explanations.
  - **Strict Fact-Checker**: Analytical, highlighting uncertainty and verifying claims.
  - **Technical Interviewer**: Senior software engineering interviewer persona.
- You can also write any custom system prompt and apply it live.

### 3. Multi-turn Conversation
- LLMs are completely **stateless**. The model does not "remember" your previous questions inside its weights.
- Multi-turn conversational memory is achieved by appending past user inputs and assistant responses into a linear array:
  ```json
  [
    {"role": "system", "content": "You are a coding tutor."},
    {"role": "user", "content": "What is a queue?"},
    {"role": "assistant", "content": "A queue is a FIFO data structure..."},
    {"role": "user", "content": "Give me a real-world example."}
  ]
  ```
- Because the entire history is sent on every turn, the model appears to have memory.

### 4. Model + Temperature Configuration
- **No hard-coded models in frontend**: Available models and pricing are declared in `backend/config.py` and fetched dynamically by the frontend from `GET /api/config`.
- **Temperature Slider (0.0 to 2.0)**:
  - `0.0 – 0.3`: Highly deterministic, focused, reproducible (ideal for code and math).
  - `0.7`: Balanced creativity and factual coherence (default).
  - `1.0 – 1.5`: Highly creative, diverse vocabulary, exploratory.

### 5. Token, Cost & Latency View
- **Response Latency**: Accurately measured on each request using high-precision performance timers (`time.perf_counter()`) and displayed in milliseconds (`⚡ ms`).
- **Token Breakdown**: Displays Prompt (input) tokens, Completion (output) tokens, and Total tokens directly from the provider's `usage` payload (with mathematical fallback if omitted).
- **Cost Estimation**: Automatically calculated per model based on input/output pricing per 1M tokens.
- **Raw JSON Inspector**: Click **"Raw Inspector"** in the top bar to inspect the exact HTTP JSON payload sent to the LLM and the raw JSON received.

### 6. Sessions + Reset
- Stores conversations server-side in `data/sessions.json`.
- Comes pre-seeded with **at least two persistent sessions**:
  1. *General Conversation*
  2. *Python & Data Structures Tutor*
- Supports creating new sessions, switching between sessions, renaming sessions inline, and deleting sessions.
- **Reset Button**: Clears the chat message history while preserving your active system prompt, selected model, and temperature settings.

### 7. Graceful Error Handling
- Network timeouts, missing API keys, invalid credentials (401), rate limits (429), and unknown models (404) are caught cleanly.
- Instead of crashing the server or hanging the UI, clean JSON errors are returned and rendered as non-intrusive toast alerts and chat diagnostics.

---

## 4. Quickstart & Setup Guide

### Step 1: Clone or Open Workspace
Open your terminal in the project directory:
```bash
cd "/Users/sama/Documents/LLMchat bot phase1"
```

### Step 2: Set Up Python Virtual Environment
```bash
# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
# On macOS / Linux:
source .venv/bin/activate
# On Windows:
# .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Configure `.env`
Edit the `.env` file in the root directory:
```env
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=your_actual_api_key_here
DEFAULT_MODEL=gpt-4o-mini
DEFAULT_TEMPERATURE=0.7
PORT=8000
HOST=127.0.0.1
```
*(You can also configure or override your API Key and Base URL directly inside the UI by clicking the ⚙️ Settings icon in the sidebar!)*

### Step 4: Run the Application
Launch the server using the single launcher script:
```bash
python3 run.py
```

Open your browser and navigate to:
- **Web Interface**: `http://localhost:8000`
- **Interactive API Swagger Docs**: `http://localhost:8000/docs`

### Step 5: Run Automated Tests
To run the automated verification test suite:
```bash
python3 tests/test_api.py
```

---

## 5. Connecting Any LLM Provider

The application uses the universal OpenAI-compatible `/chat/completions` REST API standard. You can connect it to:

| Provider | `LLM_BASE_URL` | Example Model |
| :--- | :--- | :--- |
| **OpenAI** | `https://api.openai.com/v1` | `gpt-4o-mini`, `gpt-4o` |
| **Groq (Ultra-Fast)** | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile`, `llama-3.1-8b-instant` |
| **OpenRouter** | `https://openrouter.ai/api/v1` | `meta-llama/llama-3.3-70b-instruct` |
| **DeepSeek** | `https://api.deepseek.com/v1` | `deepseek-chat` |
| **Ollama (Local / Free)** | `http://localhost:11434/v1` | `llama3.2`, `mistral` |

---

## 6. Why This App is an AI Assistant, Not an Autonomous Agent

A core theoretical requirement of this project is understanding the distinction between an **AI Assistant** and an **Autonomous Agent**.

While our LLM Playground is a capable AI conversational assistant, it is **not** an autonomous agent. Here is the detailed breakdown:

```
┌────────────────────────────────────────────────────────┐
│                   AI ASSISTANT (This App)               │
│  User Prompt ──────────▶ LLM ──────────▶ Text Response  │
│  (1 Request = 1 Response, completely reactive)         │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                   AUTONOMOUS AGENT                     │
│               ┌──────────────────────┐                 │
│               ▼                      │                 │
│  Goal ──▶ [Perceive] ──▶ [Plan/Reason] ──▶ [Act/Tool]  │
│               │                      │                 │
│               └──────── Environment ─┘                 │
│  (Runs in an autonomous loop until goal is achieved)   │
└────────────────────────────────────────────────────────┘
```

### Key Differences:

### 1. Reactive vs. Proactive Behavior
- **AI Assistant**: Operates strictly in a **request-response** loop. It sits idle waiting for the user to submit a prompt. When given a prompt, it performs one completion step and immediately stops.
- **Autonomous Agent**: Given a high-level objective (e.g., *"Find all broken links in this website and fix them"*), an agent proactively formulates sub-goals, determines which steps to take next, and initiates actions on its own without requiring human input at every step.

### 2. Lack of an Autonomous Perception-Action Loop (OODA)
- **AI Assistant**: Has no autonomous feedback loop. If the model makes a mistake, hallucinates, or produces buggy code, it does not know unless the human user reads the output, spots the error, and submits a follow-up prompt.
- **Autonomous Agent**: Runs an internal **Observe $\to$ Orient $\to$ Decide $\to$ Act** cycle. For example, it writes code, executes it in a compiler or test runner, inspects the error traceback, reflects on what went wrong, and autonomously rewrites the code until tests pass.

### 3. Absence of Tool Execution & Environmental Grounding
- **AI Assistant**: Can only generate tokens (text/strings). It has no actuators or tools connected to the physical or digital environment. If it writes a Python script, it cannot execute it; if it suggests a command, it cannot run it; if it answers a question about current weather, it cannot browse the live web unless a human feeds it data.
- **Autonomous Agent**: Has access to executable tools (file read/write, terminal execution, SQL queries, browser automation, API calling). It takes actions that physically change state in external environments.

### 4. Working Memory vs. Ephemeral Context Window
- **AI Assistant**: Relies entirely on the current HTTP request's context window. Its "memory" is simply an array of strings passed back and forth. If the conversation exceeds the model's context window (e.g. 128k tokens), earlier parts are lost or truncated.
- **Autonomous Agent**: Employs tiered memory systems:
  - **Short-term memory**: In-context execution scratchpad.
  - **Long-term episodic memory**: Vector databases with semantic retrieval.
  - **Entity / Procedural memory**: Stored rules, learned user preferences, and historical retrospectives.

### 5. Multi-Step Planning and Self-Reflection
- **AI Assistant**: Evaluates one token at a time autoregressively. It cannot build a tree of thought, backtrack from dead ends, or critically review its own reasoning before sending the final answer.
- **Autonomous Agent**: Breaks large tasks into dependency graphs (DAGs), tracks milestone progress, performs self-critique, and dynamically replans when unexpected roadblocks occur.

### Comparison Summary Table

| Feature Dimension | AI Assistant (This Application) | Autonomous AI Agent |
| :--- | :--- | :--- |
| **Execution Trigger** | Passive; awaits user prompt | Goal-driven; pursues objective autonomously |
| **Control Flow** | Single turn (Prompt $\to$ Response) | Continuous loop (Observe $\to$ Plan $\to$ Act) |
| **External Interaction** | Text generation only | Tool execution (Bash, APIs, Files, Web) |
| **Error Recovery** | Relies on user correction | Autonomous reflection and retry |
| **Decision Scope** | Local to current input turn | Global to overall objective |
| **State Persistence** | Chat turns array in storage | Working memory + Vector / Episodic databases |

---

## 7. API Documentation

When the application is running, open `http://localhost:8000/docs` to view the interactive FastAPI Swagger UI.

### Key REST Endpoints:
- `GET /api/config`: Retrieves available models, pricing catalog, and system prompt presets.
- `GET /api/sessions`: Returns all saved chat sessions with message counts and accumulated token metrics.
- `POST /api/sessions`: Creates a new session with custom title and initial system prompt.
- `GET /api/sessions/{session_id}`: Retrieves full message history for a session.
- `PUT /api/sessions/{session_id}`: Updates session title, system prompt, model, or temperature.
- `POST /api/sessions/{session_id}/reset`: Clears conversation turns while preserving session hyperparameters.
- `DELETE /api/sessions/{session_id}`: Deletes a session.
- `POST /api/chat`: Sends a message turn to the LLM, updates history, measures latency, extracts token usage, calculates cost, and returns telemetry.

---

## 8. License & Academic Attribution
Developed for the **MANDATORY PROJECT - LLM Playground Chatbot** as part of software engineering internship and BCA curriculum requirements. Free to use, adapt, and learn from.
