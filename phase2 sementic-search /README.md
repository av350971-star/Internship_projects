# 🔍 Semantic Search Engine (Pure Retrieval Layer)

> **BCA 2nd Year / AI-ML Internship Project**  
> Build dense retrieval without generation to inspect and analyze the semantic search layer in detail.

---

## 📌 Project Overview & Mandatory Requirements Fulfilled

| Requirement | Implementation Details | Status |
| :--- | :--- | :---: |
| **Retrieval Without Generation** | Direct vector similarity search; no LLM generative hallucination. Displays raw chunks, vectors, similarity metrics, and payload inspector. | ✅ Done |
| **Ingest ≥20 Docs or 200+ Chunks** | Ingests **21 documents** (1 comprehensive 35-page PDF `pdf/classification.pdf` + 20 curated technical AI/ML documents). Produces **410 chunks** in Config A and **172 chunks** in Config B. | ✅ Done |
| **Store Text, Vector, Source ID, Chunk Position & Metadata** | ChromaDB stores `text`, 384-dimensional `vector` (`all-MiniLM-L6-v2`), `source_id`, `chunk_position` (e.g. `Chunk 2 of 4`), `page`, `category`, and `char_count`. | ✅ Done |
| **Similarity Search with Top-K & Metadata Filters** | Interactive search with configurable `top_k` (1–15), source document filter, topic category filter, and minimum similarity threshold filter. | ✅ Done |
| **Compare ≥2 Chunking Configurations** | **Config A** (Small: 300 chars, 50 overlap) vs **Config B** (Large: 800 chars, 150 overlap). Includes side-by-side query comparison and automated benchmark runner on a hand-written test suite. | ✅ Done |
| **Display Similarity Score, Distance & Source** | Every retrieved card displays **Similarity Match %**, exact **Cosine Distance**, source file name, chunk position, and page number. | ✅ Done |
| **Clean React UI & Simple Python Backend** | Built with React (Vite) + Vanilla CSS and clean, beginner-friendly FastAPI backend with Swagger docs. | ✅ Done |

---

## 🏗️ Architecture & Folder Structure

```
sementic-search phase 2/
├── backend/
│   ├── __init__.py
│   ├── config.py              # Settings: paths, chunking params, benchmark queries
│   ├── vector_store.py        # ChromaDB persistent client & collection manager
│   ├── ingestion.py           # Text extraction, chunking, embedding generation
│   ├── search.py              # Semantic search retrieval & comparison logic
│   ├── benchmark.py           # Hand-written query set evaluator
│   ├── main.py                # FastAPI REST API endpoints
│   └── create_documents.py    # Generator script for 20 technical knowledge docs
├── data/
│   └── documents/             # 20 curated AI/ML documents (Supervised Learning, SVM, etc.)
├── pdf/
│   └── classification.pdf     # 35-page Machine Learning classification document
├── chroma_db_v2/              # Persistent ChromaDB vector database
├── frontend/                  # Modern React UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx        # Navigation, live stats ribbon (21 docs, 410 chunks)
│   │   │   ├── SearchTab.jsx     # Search bar, filters, top-k slider, result list
│   │   │   ├── ResultCard.jsx    # Score, distance, snippet, vector inspection payload
│   │   │   ├── CompareTab.jsx    # Side-by-side Config A vs Config B comparison
│   │   │   ├── BenchmarkTab.jsx  # Automated hand-written query evaluation table
│   │   │   └── DatasetTab.jsx    # Live corpus & chunk explorer with file upload
│   │   ├── services/
│   │   │   └── api.js            # Frontend API client
│   │   ├── App.jsx               # Main state controller
│   │   └── index.css             # Vanilla CSS design system
│   ├── package.json
│   └── vite.config.js            # Vite config with backend proxy
├── run_backend.py             # Single command to launch backend
└── README.md
```

---

## 🚀 How to Run the Project

### 1. Start the Backend
Open a terminal in the project root:
```bash
python3 run_backend.py
```
- The backend will start on **`http://127.0.0.1:8000`**.
- Interactive Swagger API Documentation: **`http://127.0.0.1:8000/docs`**.

### 2. Start the Frontend
Open another terminal tab:
```bash
cd frontend
npm run dev
```
- Open **`http://127.0.0.1:5173`** in your browser.

---

## 🔬 Core Technical Concepts (BCA Viva / Interview Guide)

### 1. What is Semantic Search vs Keyword Search?
* **Keyword Search (Lexical / BM25)**: Matches exact words. If you search *"prevent overfitting"*, it only finds documents containing those exact keywords.
* **Semantic Search (Dense Retrieval)**: Uses a neural embedding model (`all-MiniLM-L6-v2`) to convert both queries and documents into continuous 384-dimensional vector spaces. It understands meaning and context—even if exact words differ (e.g. matching *"regularization techniques"* or *"L1 Lasso"*).

### 2. Why "Retrieval Without Generation"?
* In standard RAG (Retrieval-Augmented Generation), an LLM reads retrieved chunks and generates a summary text.
* In **pure retrieval**, we strip away the LLM generation layer to directly inspect:
  - Which exact chunks the vector database retrieved.
  - What the similarity scores and cosine distances were.
  - How chunk size impacts the relevance of retrieved information.

### 3. How do Embeddings and Cosine Distance work?
* The embedding model transforms text into a 384-dimensional vector $\vec{v}$.
* Cosine Distance measures the angular difference between query vector $\vec{q}$ and document vector $\vec{d}$:
  $$\text{Cosine Distance} = 1 - \frac{\vec{q} \cdot \vec{d}}{\|\vec{q}\| \|\vec{d}\|}$$
* **Similarity Score %**:
  $$\text{Similarity \%} = (1 - \text{Cosine Distance}) \times 100$$
  - Score near 100% (Distance ~0.0): Highly similar meaning.
  - Score lower (Distance >0.5): Weak semantic relation.

### 4. Why Compare Chunking Configurations?
* **Config A (Small Chunks: 300 characters, 50 overlap)**:
  - Produces **410 granular chunks**.
  - **Advantage**: High precision for specific, factual questions. Avoids injecting extraneous sentences.
* **Config B (Large Chunks: 800 characters, 150 overlap)**:
  - Produces **172 broad chunks**.
  - **Advantage**: Retains full conceptual paragraphs and surrounding context needed for broad comprehension.

---

## 📊 Hand-Written Benchmark Query Suite (10 Queries)

The evaluation suite tests ground-truth retrieval against verified `expected_sources` using **Hit@1**, **Hit@3**, and **Mean Reciprocal Rank (MRR)**:
- **7 Direct Queries**:
  1. *"How does backpropagation update weights in a neural network using gradients?"* (`09_neural_networks_and_backprop.txt`)
  2. *"What is the difference between precision and recall in classification?"* (`16_evaluation_metrics_classification.txt`, `classification.pdf`)
  3. *"Explain how the self-attention mechanism works in Transformer models"* (`12_transformers_and_attention.txt`)
  4. *"What is the kernel trick in Support Vector Machines and why is it used?"* (`06_support_vector_machines.txt`)
  5. *"How do L1 and L2 regularization prevent overfitting?"* (`18_overfitting_and_regularization.txt`)
  6. *"How do vector databases perform approximate nearest neighbor search?"* (`14_vector_databases_chromadb.txt`, `15_semantic_search_architecture.txt`)
  7. *"How does K-Means cluster unlabeled data using centroids?"* (`19_unsupervised_clustering_kmeans.txt`)

- **3 Paraphrased Queries (Testing Pure Semantic Retrieval with Minimal Keyword Overlap)**:
  8. *"Squashing unbounded real numbers into probabilities between 0 and 1 for binary decisions"* (`03_logistic_regression.txt`, `classification.pdf`)
  9. *"Mapping words into geometric coordinates where words in similar contexts cluster together"* (`13_word_embeddings_word2vec.txt`)
  10. *"Splitting data recursively to maximize node purity using entropy or impurity metrics"* (`04_decision_trees.txt`, `classification.pdf`)

> **Why Winner is determined by Hit@3 & MRR (NOT raw similarity %)**:  
> Raw cosine similarity percentage can be inflated by longer chunks or repetitive tokens without actually retrieving the correct information. Ground-truth retrieval accuracy (Hit@3 and Mean Reciprocal Rank against verified source documents) measures genuine search quality.

Clicking **"Run Automated Benchmark"** in the UI executes all 10 queries on both configurations and dynamically generates the conclusion from computed numbers!

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/stats` | Document counts, chunk counts, model metadata |
| `GET` | `/api/filters` | List unique source files and topic categories |
| `POST` | `/api/search` | Execute semantic search with top-k and filters |
| `POST` | `/api/compare` | Compare Config A vs Config B on a single query |
| `GET` | `/api/benchmark/run` | Run benchmark suite across both configurations |
| `GET` | `/api/chunks` | Paginated raw vector records explorer |
| `POST` | `/api/upload` | Upload and auto-index custom PDF or TXT |
| `POST` | `/api/ingest` | Trigger manual re-indexing of database |
