
import os
import sys
import time
import pandas as pd
import numpy as np
import streamlit as st
from sklearn.decomposition import PCA

# Add src to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "src")))

from vector_store import VectorStoreManager
from ingestion import ingest_corpus, infer_category
from evaluator import RetrievalEvaluator, BENCHMARK_QUERIES

# Page Configuration
st.set_page_config(
    page_title="Semantic Search Engine",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for Modern, Sleek UI Aesthetics
st.markdown("""
<style>
    /* Global Styles */
    .main {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    
    /* Header & Badges */
    .hero-container {
        padding: 1.5rem 2rem;
        background: linear-gradient(135deg, #1E1E2E 0%, #2D2B55 100%);
        border-radius: 12px;
        color: white;
        margin-bottom: 1.5rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }
    
    .hero-title {
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 0.25rem;
        letter-spacing: -0.5px;
        background: linear-gradient(90deg, #A78BFA, #F472B6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    
    .hero-subtitle {
        font-size: 1rem;
        color: #D1D5DB;
        margin-bottom: 0;
    }
    
    /* Result Card Styling */
    .result-card {
        background-color: #FFFFFF !important;
        color: #0F172A !important;
        border: 1px solid #E2E8F0 !important;
        border-radius: 10px;
        padding: 1.25rem;
        margin-bottom: 1rem;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    
    .result-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.09);
        border-color: #6366F1 !important;
    }
    
    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
    
    .score-badge-high {
        background: linear-gradient(135deg, #10B981, #059669);
        color: white !important;
        font-weight: 700;
        font-size: 0.85rem;
        padding: 0.3rem 0.75rem;
        border-radius: 20px;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
    }
    
    .score-badge-med {
        background: linear-gradient(135deg, #F59E0B, #D97706);
        color: white !important;
        font-weight: 700;
        font-size: 0.85rem;
        padding: 0.3rem 0.75rem;
        border-radius: 20px;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
    }
    
    .score-badge-low {
        background: #6B7280;
        color: white !important;
        font-weight: 700;
        font-size: 0.85rem;
        padding: 0.3rem 0.75rem;
        border-radius: 20px;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
    }
    
    .meta-tag {
        background-color: rgba(99, 102, 241, 0.12);
        color: #4338CA !important;
        font-weight: 600;
        font-size: 0.75rem;
        padding: 0.25rem 0.6rem;
        border-radius: 6px;
        display: inline-block;
    }
    
    .meta-tag-category {
        background-color: rgba(236, 72, 153, 0.12);
        color: #BE185D !important;
        font-weight: 600;
        font-size: 0.75rem;
        padding: 0.25rem 0.6rem;
        border-radius: 6px;
        display: inline-block;
    }
    
    .meta-tag-pos {
        background-color: rgba(16, 185, 129, 0.12);
        color: #047857 !important;
        font-weight: 600;
        font-size: 0.75rem;
        padding: 0.25rem 0.6rem;
        border-radius: 6px;
        display: inline-block;
    }
    
    .chunk-text-box {
        color: #0F172A !important;
        font-size: 0.95rem;
        font-weight: 450;
        line-height: 1.65;
        padding: 0.85rem 1.1rem;
        background-color: #F8FAFC !important;
        border: 1px solid #E2E8F0 !important;
        border-left: 4px solid #6366F1 !important;
        border-radius: 0 8px 8px 0;
        margin: 0.75rem 0;
        white-space: pre-wrap;
    }
    
    .vector-inspect-box {
        font-family: "Courier New", Courier, monospace;
        font-size: 0.75rem;
        padding: 0.5rem;
        background: #181825;
        color: #A6ADC8;
        border-radius: 6px;
        overflow-x: auto;
    }
    
    .stat-pill {
        background: rgba(128, 128, 128, 0.08);
        border-radius: 8px;
        padding: 0.75rem 1rem;
        border: 1px solid rgba(128, 128, 128, 0.15);
        text-align: center;
    }
</style>
""", unsafe_allow_html=True)


@st.cache_resource
def get_vector_store():
    """Initializes and caches the VectorStoreManager."""
    return VectorStoreManager(persist_directory="results/chroma_db")


@st.cache_resource
def get_evaluator(_vsm):
    """Initializes and caches the RetrievalEvaluator."""
    return RetrievalEvaluator(vector_store=_vsm)


# Initialize components
vsm = get_vector_store()
evaluator = get_evaluator(vsm)

# Header Banner
st.markdown("""
<div class="hero-container">
    <div class="hero-title">⚡ Semantic Search & Retrieval Engine</div>
    <div class="hero-subtitle">
        Pure Vector Retrieval • Dense Embeddings (384-d) • Multi-Chunking Benchmark • Transparent Inspection
    </div>
</div>
""", unsafe_allow_html=True)

# Fetch collection statistics
stats_a = vsm.get_collection_stats("config_a")
stats_b = vsm.get_collection_stats("config_b")

# Sidebar Controls
with st.sidebar:
    st.header("⚙️ Search Configuration")
    
    # Corpus Ingestion Status
    is_indexed = stats_a["count"] > 0 and stats_b["count"] > 0
    
    if not is_indexed:
        st.warning("⚠️ Corpus not yet indexed in ChromaDB.")
        if st.button("🚀 Ingest 20 PDF Documents", type="primary", use_container_width=True):
            with st.status("Ingesting and embedding 20 PDF documents...", expanded=True) as status:
                prog_bar = st.progress(0)
                def update_prog(curr, total, name):
                    prog_bar.progress(curr / total)
                    st.write(f"📄 Processing {name} ({curr}/{total})...")
                res = ingest_corpus(progress_callback=update_prog)
                status.update(label="Ingestion Complete!", state="complete", expanded=False)
                st.success(f"Indexed {res['total_chunks_a']} (Config A) & {res['total_chunks_b']} (Config B) chunks!")
                st.rerun()
    else:
        st.success(f"✅ Indexed {stats_a['total_docs']} Documents")
        col_s1, col_s2 = st.columns(2)
        with col_s1:
            st.metric("Config A Chunks", stats_a["count"])
        with col_s2:
            st.metric("Config B Chunks", stats_b["count"])
            
        with st.expander("🔄 Re-Index Options"):
            if st.button("Re-run Ingestion Pipeline", use_container_width=True):
                with st.spinner("Re-indexing corpus..."):
                    ingest_corpus()
                    st.rerun()

    st.markdown("---")
    st.subheader("🔍 Query Parameters")
    
    selected_config = st.radio(
        "Active Chunking Strategy",
        options=["config_a", "config_b"],
        format_func=lambda x: "Config A: Fine-Grained (400 chars)" if x == "config_a" else "Config B: Sentence-Aware (1000 chars)",
        help="Select which chunking strategy to query directly."
    )
    
    top_k = st.slider("Top-K Retrieved Chunks", min_value=1, max_value=15, value=5, step=1)
    min_similarity = st.slider("Min Similarity Threshold (%)", min_value=0, max_value=100, value=20, step=5) / 100.0

    st.markdown("---")
    st.subheader("🎯 Metadata Filters")
    
    all_docs = ["All"] + stats_a.get("documents", [])
    filter_doc = st.selectbox("Filter by Document", options=all_docs, index=0)
    
    all_categories = ["All"] + stats_a.get("categories", [])
    filter_cat = st.selectbox("Filter by Category", options=all_categories, index=0)
    
    st.caption("Dense Embedding: `sentence-transformers/all-MiniLM-L6-v2` (384-dim, Cosine Space)")


# Main Navigation Tabs
tab_search, tab_compare, tab_bench, tab_corpus = st.tabs([
    "🔍 Semantic Search Studio",
    "⚖️ Chunking Comparison Lab",
    "📊 Evaluation Benchmark",
    "📚 Corpus & 2D Vector Space"
])


# ==========================================
# TAB 1: SEMANTIC SEARCH STUDIO
# ==========================================
with tab_search:
    st.markdown("### 🔍 Live Semantic Search & Inspection")
    st.caption("Direct vector similarity retrieval without generative hallucination. Inspect exact scores, raw distances, and chunk bounds.")

    # Search Bar & Preset Queries
    preset_col, _ = st.columns([4, 1])
    sample_queries = [
        "Self-attention mechanism and scaled dot-product in Transformers",
        "How do Convolutional Neural Networks extract visual features?",
        "L1 vs L2 regularization and preventing overfitting in Deep Learning",
        "Support Vector Machine maximum margin hyperplane and kernel trick",
        "K-Nearest Neighbors distance computation and nearest neighbors",
        "Decision Trees Gini impurity vs Entropy splitting criteria",
        "Precision, Recall, F1 Score and ROC-AUC curve"
    ]
    
    selected_sample = st.selectbox("💡 Try a sample AI/ML query:", options=["Custom Query..."] + sample_queries)
    
    default_text = "" if selected_sample == "Custom Query..." else selected_sample
    query_input = st.text_input("Enter search query:", value=default_text, placeholder="e.g. How does backpropagation calculate gradients in deep neural networks?")

    search_button = st.button("🔎 Execute Semantic Search", type="primary")

    if (query_input and query_input.strip()) or search_button:
        query_text = query_input.strip() if query_input else default_text
        if not query_text:
            st.warning("Please enter a query.")
        else:
            # Build filters
            filters = {}
            if filter_doc != "All":
                filters["source_id"] = filter_doc
            if filter_cat != "All":
                filters["category"] = filter_cat
                
            t_start = time.time()
            results = vsm.query(
                query_text=query_text,
                config_key=selected_config,
                top_k=top_k,
                metadata_filters=filters,
                score_threshold=min_similarity
            )
            latency_ms = round((time.time() - t_start) * 1000, 2)
            
            # Header summary
            st.markdown(f"**Found {len(results)} chunks** matching `{query_text}` in `{latency_ms} ms` using **{selected_config.upper()}**")
            
            if not results:
                st.info("No chunks met the similarity threshold or filter criteria. Try lowering the threshold or clearing metadata filters.")
            else:
                for r in results:
                    score = r["score"]
                    score_pct = r["similarity_pct"]
                    dist = r["distance"]
                    
                    if score >= 0.65:
                        badge_class = "score-badge-high"
                        badge_icon = "🟢"
                    elif score >= 0.40:
                        badge_class = "score-badge-med"
                        badge_icon = "🟡"
                    else:
                        badge_class = "score-badge-low"
                        badge_icon = "⚪"
                        
                    with st.container():
                        st.markdown(f"""
                        <div class="result-card">
                            <div class="card-header">
                                <div>
                                    <span class="{badge_class}">{badge_icon} Similarity: {score_pct}%</span>
                                    <span style="font-size: 0.8rem; color: #475569; font-weight: 500; margin-left: 8px;">(Cosine Dist: {dist})</span>
                                </div>
                                <div>
                                    <span class="meta-tag">📄 {r['source_id']}</span>
                                    <span class="meta-tag-category">🏷️ {r['category']}</span>
                                    <span class="meta-tag-pos">🧩 Chunk {r['chunk_index'] + 1} (Pg {r['page_number']})</span>
                                </div>
                            </div>
                            <div class="chunk-text-box">{r['text']}</div>
                        </div>
                        """, unsafe_allow_html=True)
                        
                        # Expandable Vector & Metadata Inspector
                        with st.expander(f"🔬 Inspect Chunk Vector & Metadata (Rank #{r['rank']})"):
                            col_m1, col_m2 = st.columns(2)
                            with col_m1:
                                st.write("**Chunk Metadata:**")
                                st.json({
                                    "source_id": r["source_id"],
                                    "page_number": r["page_number"],
                                    "total_pages": r["total_pages"],
                                    "chunk_index": r["chunk_index"],
                                    "char_length": r["char_count"],
                                    "category": r["category"],
                                    "config_tag": r["config_tag"]
                                })
                            with col_m2:
                                st.write("**Vector Embedding Details:**")
                                st.write("- Dimensions: `384`")
                                st.write("- Metric: `Cosine Similarity`")
                                st.write("- First 5 Dimensions Preview:")
                                vec_sample = r.get("vector_sample")
                                if vec_sample is not None and len(vec_sample) > 0:
                                    st.code(str([round(float(v), 4) for v in vec_sample]))
                                else:
                                    st.caption("Vector preview available when embedded.")


# ==========================================
# TAB 2: CHUNKING COMPARISON LAB
# ==========================================
with tab_compare:
    st.markdown("### ⚖️ Side-by-Side Chunking Configuration Lab")
    st.caption("Directly compare how **Config A (Small Fixed Chunks: 400 chars)** vs **Config B (Sentence-Aware Large Chunks: 1000 chars)** retrieve context for the same query.")
    
    comp_query = st.text_input(
        "Comparison Query:",
        value="What is the self-attention mechanism and scaled dot-product attention in Transformers?",
        key="comp_query_input"
    )
    
    comp_top_k = st.slider("Comparison Top-K", min_value=1, max_value=8, value=4, key="comp_top_k_slider")
    
    if st.button("⚡ Run Side-by-Side Comparison", type="primary", key="btn_run_comp"):
        with st.spinner("Retrieving across both configurations..."):
            comp_res = evaluator.compare_single_query(comp_query, top_k=comp_top_k)
            
            # Metric Summary Cards
            st.markdown("#### 📈 Key Comparison Metrics")
            m_col1, m_col2, m_col3, m_col4 = st.columns(4)
            with m_col1:
                st.metric(
                    "Top-1 Score (A vs B)",
                    f"{comp_res['config_a']['top1_score'] * 100:.1f}%",
                    delta=f"{(comp_res['config_b']['top1_score'] - comp_res['config_a']['top1_score']) * 100:+.1f}% (B)",
                    help="Comparison of top-1 retrieved score"
                )
            with m_col2:
                st.metric(
                    "Mean Score (A vs B)",
                    f"{comp_res['config_a']['mean_score'] * 100:.1f}%",
                    delta=f"{(comp_res['config_b']['mean_score'] - comp_res['config_a']['mean_score']) * 100:+.1f}% (B)"
                )
            with m_col3:
                st.metric(
                    "Avg Chunk Length (Chars)",
                    f"{comp_res['config_a']['avg_char_length']} c",
                    delta=f"{comp_res['config_b']['avg_char_length'] - comp_res['config_a']['avg_char_length']:+.0f} c (B)"
                )
            with m_col4:
                st.metric(
                    "Source Jaccard Overlap",
                    f"{comp_res['source_overlap_jaccard'] * 100:.0f}%",
                    help="Document source agreement between Config A and Config B"
                )
                
            st.markdown("---")
            
            # Split Columns for Config A and Config B
            col_a, col_b = st.columns(2)
            
            with col_a:
                st.markdown("#### 🔹 Config A: Fine-Grained (400 chars)")
                st.caption(f"Latency: `{comp_res['config_a']['latency_ms']} ms` | Top-1 Score: `{comp_res['config_a']['top1_score'] * 100:.1f}%`")
                for item in comp_res["config_a"]["results"]:
                    st.markdown(f"""
                    <div class="result-card">
                        <div class="card-header">
                            <span class="score-badge-high">Rank #{item['rank']} • {item['similarity_pct']}%</span>
                            <span class="meta-tag">📄 {item['source_id']}</span>
                        </div>
                        <div style="font-size: 0.82rem; color: #475569; font-weight: 500;">Pg {item['page_number']} | Chunk {item['chunk_index']+1} | {item['char_count']} chars</div>
                        <div class="chunk-text-box">{item['text']}</div>
                    </div>
                    """, unsafe_allow_html=True)
                    
            with col_b:
                st.markdown("#### 🔸 Config B: Sentence-Aware Large (1000 chars)")
                st.caption(f"Latency: `{comp_res['config_b']['latency_ms']} ms` | Top-1 Score: `{comp_res['config_b']['top1_score'] * 100:.1f}%`")
                for item in comp_res["config_b"]["results"]:
                    st.markdown(f"""
                    <div class="result-card">
                        <div class="card-header">
                            <span class="score-badge-high" style="background: linear-gradient(135deg, #6366F1, #4F46E5);">Rank #{item['rank']} • {item['similarity_pct']}%</span>
                            <span class="meta-tag">📄 {item['source_id']}</span>
                        </div>
                        <div style="font-size: 0.82rem; color: #475569; font-weight: 500;">Pg {item['page_number']} | Chunk {item['chunk_index']+1} | {item['char_count']} chars</div>
                        <div class="chunk-text-box" style="border-left-color: #EC4899; color: #0F172A !important;">{item['text']}</div>
                    </div>
                    """, unsafe_allow_html=True)


# ==========================================
# TAB 3: EVALUATION BENCHMARK
# ==========================================
with tab_bench:
    st.markdown("### 📊 Curated Benchmark Evaluation Suite")
    st.caption("Benchmark suite executing 10 hand-written test queries covering the 20 AI/ML documents to evaluate chunking retrieval quality, hit rate, and latency.")
    
    with st.expander("📝 View 10 Hand-Written Benchmark Queries", expanded=False):
        b_df = pd.DataFrame([
            {"ID": q["id"], "Topic": q["topic"], "Query": q["query"], "Expected Sources": ", ".join(q["expected_sources"])}
            for q in BENCHMARK_QUERIES
        ])
        st.dataframe(b_df, use_container_width=True)
        
    bench_top_k = st.slider("Benchmark Top-K", min_value=1, max_value=10, value=5, key="bench_topk")
    
    if st.button("🚀 Run Full Benchmark Suite", type="primary", key="btn_run_benchmark"):
        with st.spinner("Running retrieval evaluations on all 10 queries..."):
            summary = evaluator.run_benchmark(top_k=bench_top_k)
            
            st.markdown("#### 🏆 Benchmark Summary Results")
            c1, c2, c3, c4 = st.columns(4)
            with c1:
                st.metric("Config A Mean Top-1", f"{summary['config_a_mean_top1'] * 100:.2f}%")
            with c2:
                st.metric("Config B Mean Top-1", f"{summary['config_b_mean_top1'] * 100:.2f}%")
            with c3:
                st.metric("Config A Expected Hit Rate", f"{summary['config_a_expected_hit_rate']}%")
            with c4:
                st.metric("Config B Expected Hit Rate", f"{summary['config_b_expected_hit_rate']}%")
                
            st.markdown("---")
            
            # Comparison Dataframe
            st.markdown("#### 📋 Detailed Query Breakdown")
            table_rows = []
            for q in summary["query_details"]:
                table_rows.append({
                    "ID": q["id"],
                    "Topic": q["topic"],
                    "Query Snippet": q["query"][:60] + "...",
                    "Config A Top-1": f"{q['top1_a'] * 100:.1f}%",
                    "Config B Top-1": f"{q['top1_b'] * 100:.1f}%",
                    "Config A Mean": f"{q['mean_a'] * 100:.1f}%",
                    "Config B Mean": f"{q['mean_b'] * 100:.1f}%",
                    "Latency A (ms)": q["latency_a_ms"],
                    "Latency B (ms)": q["latency_b_ms"],
                    "Source Jaccard": f"{q['jaccard_overlap'] * 100:.0f}%"
                })
            st.dataframe(pd.DataFrame(table_rows), use_container_width=True)
            
            # Chart Visualization
            st.markdown("#### 📊 Similarity Score Comparison by Query")
            chart_df = pd.DataFrame([
                {"Query ID": q["id"], "Score": q["top1_a"] * 100, "Configuration": "Config A (400 chars)"}
                for q in summary["query_details"]
            ] + [
                {"Query ID": q["id"], "Score": q["top1_b"] * 100, "Configuration": "Config B (1000 chars)"}
                for q in summary["query_details"]
            ])
            
            st.bar_chart(chart_df, x="Query ID", y="Score", color="Configuration")


# ==========================================
# TAB 4: CORPUS & 2D VECTOR SPACE
# ==========================================
with tab_corpus:
    st.markdown("### 📚 Corpus Analytics & 2D Semantic Embedding Space")
    st.caption("Visualizing the dense vector representations of chunks across all 20 PDF documents projected onto 2D space via PCA.")
    
    col_c1, col_c2, col_c3 = st.columns(3)
    with col_c1:
        st.metric("Total Indexed Documents", stats_a["total_docs"])
    with col_c2:
        st.metric("Config A Total Chunks", stats_a["count"])
    with col_c3:
        st.metric("Config B Total Chunks", stats_b["count"])
        
    st.markdown("---")
    
    # Document Breakdown Table
    st.markdown("#### 📑 Document Chunk Distribution")
    doc_dist_a = stats_a.get("doc_distribution", {})
    doc_dist_b = stats_b.get("doc_distribution", {})
    
    doc_rows = []
    for doc_name, count_a in doc_dist_a.items():
        count_b = doc_dist_b.get(doc_name, 0)
        doc_rows.append({
            "Document Filename": doc_name,
            "Category": infer_category(doc_name),
            "Config A Chunks (400 chars)": count_a,
            "Config B Chunks (1000 chars)": count_b
        })
        
    if doc_rows:
        st.dataframe(pd.DataFrame(doc_rows), use_container_width=True)
        
    st.markdown("---")
    
    # 2D PCA Embedding Visualizer
    st.markdown("#### 🌌 2D Vector Embedding Projection (PCA)")
    st.caption("Explore how semantic vector clusters form naturally based on AI/ML topics (Transformers, Computer Vision, Deep Learning, etc.)")
    
    vis_config = st.selectbox("Select Strategy for 2D Projection", ["config_a", "config_b"], format_func=lambda x: "Config A (Small)" if x=="config_a" else "Config B (Large)")
    
    if st.button("🔮 Compute & Plot 2D Vector Projections", type="primary"):
        with st.spinner("Extracting 384-dimensional embeddings and computing PCA..."):
            vis_data = vsm.get_all_vectors_for_visualization(vis_config, max_samples=400)
            embeddings = vis_data["embeddings"]
            
            if embeddings is not None and len(embeddings) > 0:
                pca = PCA(n_components=2, random_state=42)
                coords_2d = pca.fit_transform(embeddings)
                
                plot_df = pd.DataFrame({
                    "PCA Dimension 1": coords_2d[:, 0],
                    "PCA Dimension 2": coords_2d[:, 1],
                    "Document": vis_data["sources"],
                    "Category": vis_data["categories"],
                    "Page": vis_data["pages"],
                    "Preview": vis_data["texts"]
                })
                
                st.scatter_chart(
                    plot_df,
                    x="PCA Dimension 1",
                    y="PCA Dimension 2",
                    color="Category",
                    size=20
                )
                st.caption(f"Explained Variance Ratio by top 2 PCA components: {round(sum(pca.explained_variance_ratio_)*100, 2)}%")
            else:
                st.warning("No embeddings found in the vector database to project.")
