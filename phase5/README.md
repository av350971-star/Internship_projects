# 📚 Cited Knowledge Assistant

> **A Grounded, Multi-Tenant Document Assistant with Verifiable In-Line Citations and Weak-Evidence Decline**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Sentence-Transformers](https://img.shields.io/badge/Embeddings-MiniLM--L6--v2-blue.svg)](https://www.sbert.net/)
[![BM25](https://img.shields.io/badge/Sparse-Okapi_BM25-orange.svg)](https://en.wikipedia.org/wiki/Okapi_BM25)
[![React](https://img.shields.io/badge/Frontend-React_19_Vite-61dafb.svg?logo=react)](https://vitejs.dev)
[![Benchmark](https://img.shields.io/badge/Evaluation-25--Question_Suite-green.svg)](#-25-question-evaluation-benchmark)

---

## 💡 How It Works (Simple Explanation for BCA / Viva)

Imagine asking a research librarian a question with strict rules:
1. **Never guess or make things up (No Hallucination)**: The assistant is only allowed to answer using documents in its library.
2. **Prove your work (Source Citations)**: Every factual claim must point to an exact document and chunk with in-line tags like `[1]`, `[2]`.
3. **Say "I Don't Know" when evidence is weak (Evidence Gate)**: If the highest relevance match is below a confidence threshold (e.g. `0.35`) or the question is outside company docs, the system deterministically **declines to answer** without wasting AI tokens.
4. **Best of both worlds search (Dense + BM25 Hybrid)**:
   - **Dense Vectors (MiniLM)**: Great for understanding meaning and synonyms (e.g. *"vacation policy"* matches *"casual leave rollover"*).
   - **Sparse BM25 (Keywords)**: Great for exact error codes, numbers, and ports (e.g. `ERR-502-GATEWAY`, port `8080`, port `2222`).
   - **Hybrid Fusion**: Combines both to give the most accurate ranking.
5. **Strict Tenant Privacy (Multi-Tenancy)**: Users in `tenant_engineering` can NEVER search or see documents belonging to `tenant_hr`, and vice versa.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    User([User / Browser]) -->|Query + Tenant ID| API[FastAPI Server]
    
    subgraph Multi_Format_Ingestion [Multi-Format Ingestion Engine]
        DocFile[PDF / DOCX / TXT / MD / JSON] --> Parser[Format Extractor]
        Parser --> Checksum[SHA-256 Checksum & Update Flow]
        Checksum --> Chunker[Sliding Window Chunker (500 chars, 60 overlap)]
        Chunker --> DB[(SQLite: Chunks & Metadata)]
        Chunker --> DenseIndex[Dense Embeddings: MiniLM-L6-v2]
        Chunker --> SparseIndex[Sparse Index: Okapi BM25]
    end

    subgraph Hybrid_Retrieval_Pipeline [Tenant-Isolated Retrieval]
        API --> TenantFilter[WHERE tenant_id = current_tenant]
        TenantFilter --> DenseSearch[Dense Vector Search (Cosine Similarity)]
        TenantFilter --> SparseSearch[BM25 Keyword Search (Subword Tokenized)]
        DenseSearch --> Fuser[Hybrid Score Fusion: alpha * Dense + (1-alpha) * BM25]
        SparseSearch --> Fuser
        Fuser --> Reranker[Retrieval Refinement & Lexical Term Boost]
    end

    subgraph Evidence_Gate [Evidence Decision Gate]
        Reranker --> CheckThreshold{Max Score >= Threshold (0.35)?}
        CheckThreshold -- No --> FastDecline[Deterministic Decline: Weak Evidence]
        CheckThreshold -- Yes --> GroundedPrompt[Strict Grounding Prompt]
    end

    subgraph Grounded_Generation [LLM & Citation Attribution]
        GroundedPrompt --> LLM[External AI API: gemini-pro]
        LLM --> CitationParser[Extract [1], [2] & Map to Chunk Snippets]
        CitationParser --> FinalAnswer[Grounded Answer with Clickable Citations]
    end

    FastDecline --> User
    FinalAnswer --> User
```

---

## 🌟 Key Features

### 1. Multi-Format Ingestion & Re-indexing
- **Supported Formats**: `.pdf` (PyMuPDF), `.docx` (python-docx), `.txt`, `.md`, `.json`.
- **Deduplication**: Computes SHA-256 file checksums. If an identical file is uploaded, it is recognized without duplicate embeddings.
- **Update Flow**: Uploading an updated version of an existing file automatically deletes old chunks and re-indexes the new content seamlessly.

### 2. Dense vs. Sparse vs. Hybrid Retrieval
| Search Method | Technology | Primary Strength | Example Winning Query |
|---|---|---|---|
| **Dense** | `SentenceTransformer("all-MiniLM-L6-v2")` | Conceptual & semantic synonym matching | *"How can employees take time off for illness?"* |
| **Sparse** | `Okapi BM25` with subword tokenization | Exact error codes, port numbers, identifiers | *"What causes ERR-502-GATEWAY?"* |
| **Hybrid** | Score Fusion: $\alpha \cdot \text{Dense} + (1-\alpha) \cdot \text{BM25}$ | Robust precision across keywords and semantics | *"Docker container port and Kubernetes healthcheck endpoints"* |

### 3. Weak Evidence Decision Gate (Hallucination Prevention)
- Before querying the LLM, the system computes the highest match score across retrieved chunks.
- If $\text{HighestScore} < \text{Threshold}$ ($0.35$):
  - The query is intercepted immediately.
  - The system deterministically returns:
    > *"I am unable to answer based on the provided documents because the available evidence is insufficient."*
  - This eliminates hallucinations on out-of-domain queries and saves external API costs.

### 4. Verifiable In-Line Source Citations
- The assistant appends `[1]`, `[2]` directly to every factual statement.
- In the UI, clicking any citation pill opens the **Source Chunk Verification Modal**, displaying:
  - Source document name
  - Page number and section heading
  - Exact chunk ID
  - Similarity relevance percentage
  - Full verbatim text excerpt

### 5. Multi-Tenant Access Isolation
- Documents and chunks are partitioned by `tenant_id` (`tenant_engineering` vs `tenant_hr`).
- All queries strictly enforce: `SELECT * FROM chunks WHERE tenant_id = ?`.
- Even if a user attempts a cross-tenant query (e.g. asking for HR salary data while in the Engineering tenant), the retrieval returns 0 chunks and automatically declines.

---

## 📊 25-Question Evaluation Benchmark

The project includes an automated benchmark test suite (`evaluate_25.py` and UI Dashboard) covering 7 distinct query categories:

| # | Category | Queries | Expected Behavior | Description |
|---|---|:---:|:---:|---|
| 1 | **Direct Fact Retrieval** | 6 | `ANSWER` | Tests exact factual extraction with citations |
| 2 | **Semantic Paraphrase** | 4 | `ANSWER` | Tests dense retrieval on synonyms & indirect phrasing |
| 3 | **Keyword & Code Identifier** | 4 | `ANSWER` | Tests BM25 precision on codes like `ERR-502` & port numbers |
| 4 | **Cross-Document Synthesis** | 3 | `ANSWER` | Tests combining facts from multiple documents |
| 5 | **No-Answer / Out-of-Domain** | 4 | `DECLINE` | Tests weak evidence decline on unmentioned facts |
| 6 | **Adversarial / Injection** | 2 | `DECLINE` | Tests prompt injection resistance and instruction overrides |
| 7 | **Cross-Tenant Isolation** | 2 | `DECLINE` | Tests security isolation when querying another tenant's data |

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Setup Configuration
A `.env` file is already created:
```bash
# External AI API Configuration
AI_BASE_URL=https://ai-service-by-nik6348.vercel.app/v1
AI_API_KEY=Shiv+Shakti=Love@143
AI_MODEL=gemini-pro

# Storage Configuration
SQLITE_DB_PATH=data/cited_assistant.db

# Retrieval & Evidence Thresholds
MIN_CONFIDENCE_THRESHOLD=0.35
HYBRID_ALPHA=0.5
MAX_RETRIEVAL_CHUNKS=4
```

### 3. Start the Backend Server
```bash
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
- API Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- Swagger API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 4. Start the Frontend
```bash
cd frontend
npm run dev
```
- Open [http://localhost:5175/](http://localhost:5175/) in your browser.

### 5. Run the 25-Question Benchmark Suite
```bash
python3 evaluate_25.py
```

---

## 📁 Directory Structure

```text
phase5/
├── .env                              # API keys and thresholds
├── .env.example                      # Configuration template
├── requirements.txt                  # Python dependencies
├── README.md                         # Documentation & Viva guide
├── evaluate_25.py                    # 25-Question automated evaluation runner
├── data/
│   ├── cited_assistant.db            # SQLite database for chunks & metadata
│   └── evaluation_results.json       # Benchmark test results
├── sample_documents/
│   ├── tenant_engineering/          # Tech architecture, deployment, system specs
│   │   ├── api_architecture.md
│   │   ├── system_specs.json
│   │   ├── deployment_guide.txt
│   │   └── network_security.pdf
│   └── tenant_hr/                   # Leave policy, handbook, compensation
│       ├── employee_handbook.txt
│       ├── leave_policy.txt
│       ├── compensation_rules.md
│       └── relocation_policy.docx
├── backend/
│   ├── config.py                     # Environment and app settings
│   ├── main.py                       # FastAPI application & endpoints
│   ├── storage/
│   │   └── sqlite_store.py           # SQLite persistence layer
│   └── services/
│       ├── ingestion.py              # Multi-format parser & chunker
│       ├── embeddings.py             # SentenceTransformers dense search
│       ├── bm25_retriever.py         # BM25 sparse keyword search
│       ├── hybrid_search.py          # Dense + Sparse hybrid fusion
│       ├── reranker.py               # Score refinement & evidence gate
│       ├── llm_service.py            # External AI API & citation parser
│       └── evaluation_dataset.py     # 25-Question benchmark dataset
└── frontend/
    ├── package.json
    ├── vite.config.js                # Port 5175 with API proxy
    ├── index.html
    └── src/
        ├── App.jsx                   # Main layout and tab coordinator
        ├── index.css                 # Clean, modern, responsive styling
        └── components/
            ├── Header.jsx            # Tenant selector & navigation tabs
            ├── AssistantChat.jsx     # Chat UI with clickable citations
            ├── DocumentManager.jsx   # Ingestion, re-indexing, deletion
            ├── SearchComparison.jsx  # Dense vs Sparse vs Hybrid view
            ├── EvaluationDashboard.jsx # 25-Question benchmark runner
            └── CitationModal.jsx     # Source chunk verification modal
```

---

## 🎓 Viva & Interview Q&A (Top Questions & Answers)

### Q1: What is the main difference between Dense and Sparse retrieval?
> **Answer**:  
> **Dense Retrieval** represents text as numerical vectors (embeddings) capturing semantic meaning and synonyms (e.g., *"annual holiday"* matches *"paid vacation"*).  
> **Sparse Retrieval (BM25)** matches exact words and term frequencies, making it ideal for technical codes, serial numbers, error names, and specific identifiers (e.g., `ERR-502`, port `8080`).

### Q2: Why use Hybrid Search instead of Dense search alone?
> **Answer**:  
> Pure vector search can suffer from vocabulary mismatch on specialized domain terms, numbers, and short acronyms. Hybrid search fuses normalized dense and sparse scores:
> $$\text{Score} = \alpha \cdot \text{Dense} + (1 - \alpha) \cdot \text{BM25}$$
> This guarantees high accuracy whether the user uses colloquial paraphrasing or exact technical codes.

### Q3: How does the system prevent LLM hallucinations?
> **Answer**:  
> Through a two-stage defense:  
> 1. **Evidence Gate**: If the highest chunk similarity score is below `0.35`, the system intercepts the request before reaching the LLM and declines deterministically.  
> 2. **Grounded Prompting**: When evidence is sufficient, the system prompt strictly instructs the model to use only the provided chunks and append verifiable `[1]`, `[2]` citations to every claim.

### Q4: How is Multi-Tenant Isolation enforced?
> **Answer**:  
> Multi-tenancy is enforced at the database retrieval level. Every document, chunk, and search query is tagged with a `tenant_id`. All vector and keyword queries filter chunks with `WHERE tenant_id = current_tenant`. Cross-tenant retrieval is architecturally impossible.
