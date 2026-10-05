import time
from typing import List, Dict, Any
from vector_store import VectorStoreManager
import pandas as pd


BENCHMARK_QUERIES = [
    {
        "id": "Q1",
        "query": "What is the self-attention mechanism and scaled dot-product attention in Transformers?",
        "topic": "Transformers & Attention",
        "expected_sources": ["Attention Mechanism.pdf", "Transformers.pdf"]
    },
    {
        "id": "Q2",
        "query": "How do Convolutional Neural Networks extract spatial features using convolution filters and pooling?",
        "topic": "Computer Vision & CNN",
        "expected_sources": ["CNN.pdf", "Computer Vision.pdf"]
    },
    {
        "id": "Q3",
        "query": "Techniques to prevent overfitting using L1 and L2 weight regularization and dropout",
        "topic": "Regularization & Overfitting",
        "expected_sources": ["regularization adn overfitting.pdf", "Deep+Learning+Ian+Goodfellow.pdf"]
    },
    {
        "id": "Q4",
        "query": "How does K-Nearest Neighbors compute distance metrics and classify nearest data points?",
        "topic": "K-Nearest Neighbors",
        "expected_sources": ["_knn_notes.pdf", "classification.pdf"]
    },
    {
        "id": "Q5",
        "query": "Support Vector Machine maximum margin hyperplane and kernel trick formulation",
        "topic": "Support Vector Machines",
        "expected_sources": ["Support_Vector_Machines_Theory_and_Applications.pdf", "Foundations_of_Machine_Learning.pdf"]
    },
    {
        "id": "Q6",
        "query": "Ensemble learning with Random Forests bagging and decision tree splitting",
        "topic": "Ensemble Methods",
        "expected_sources": ["randomforest.pdf", "Decision_Trees.pdf"]
    },
    {
        "id": "Q7",
        "query": "Evaluation metrics for classification: Precision, Recall, F1 Score, and ROC-AUC curve",
        "topic": "Model Evaluation & Metrics",
        "expected_sources": ["9.AI_MLcoursenotes-ModelEvaluationandMetrics.pdf", "classification.pdf"]
    },
    {
        "id": "Q8",
        "query": "How does Backpropagation calculate gradients through the chain rule in Deep Neural Networks?",
        "topic": "Neural Networks & Deep Learning",
        "expected_sources": ["Neural Networks and Deep Learning-eng.pdf", "Deep+Learning+Ian+Goodfellow.pdf"]
    },
    {
        "id": "Q9",
        "query": "Unsupervised clustering algorithms K-Means centroid update and cluster assignment",
        "topic": "Clustering & Unsupervised",
        "expected_sources": ["clustering.pdf", "Unsupervised_Learning Final.pdf"]
    },
    {
        "id": "Q10",
        "query": "Recurrent Neural Networks hidden states and vanishing gradient problem in sequential data",
        "topic": "Recurrent Architectures",
        "expected_sources": ["RNN.pdf", "Artificial_Intelligence_Methods_in_Natural_Languag.pdf"]
    }
]


class RetrievalEvaluator:
    """
    Evaluator to compare Chunking Configuration A (Small Fixed) vs
    Configuration B (Large Sentence-Aware) across benchmark queries.
    """
    
    def __init__(self, vector_store: VectorStoreManager = None):
        self.vsm = vector_store or VectorStoreManager()
        
    def compare_single_query(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        """
        Runs retrieval for both configurations on a single query and computes comparison metrics.
        """
        # Config A search
        t0 = time.time()
        results_a = self.vsm.query(query, config_key="config_a", top_k=top_k)
        latency_a_ms = round((time.time() - t0) * 1000, 2)
        
        # Config B search
        t1 = time.time()
        results_b = self.vsm.query(query, config_key="config_b", top_k=top_k)
        latency_b_ms = round((time.time() - t1) * 1000, 2)
        
        # Calculate stats for A
        scores_a = [r["score"] for r in results_a] if results_a else [0.0]
        top1_a = scores_a[0] if scores_a else 0.0
        mean_score_a = sum(scores_a) / len(scores_a) if scores_a else 0.0
        sources_a = set(r["source_id"] for r in results_a)
        avg_chars_a = sum(r["char_count"] for r in results_a) / len(results_a) if results_a else 0
        
        # Calculate stats for B
        scores_b = [r["score"] for r in results_b] if results_b else [0.0]
        top1_b = scores_b[0] if scores_b else 0.0
        mean_score_b = sum(scores_b) / len(scores_b) if scores_b else 0.0
        sources_b = set(r["source_id"] for r in results_b)
        avg_chars_b = sum(r["char_count"] for r in results_b) / len(results_b) if results_b else 0
        
        # Document overlap (Jaccard)
        union_sources = sources_a.union(sources_b)
        inter_sources = sources_a.intersection(sources_b)
        jaccard_sources = round(len(inter_sources) / len(union_sources), 3) if union_sources else 1.0
        
        return {
            "query": query,
            "config_a": {
                "results": results_a,
                "top1_score": round(top1_a, 4),
                "mean_score": round(mean_score_a, 4),
                "latency_ms": latency_a_ms,
                "avg_char_length": round(avg_chars_a, 1),
                "unique_sources": list(sources_a)
            },
            "config_b": {
                "results": results_b,
                "top1_score": round(top1_b, 4),
                "mean_score": round(mean_score_b, 4),
                "latency_ms": latency_b_ms,
                "avg_char_length": round(avg_chars_b, 1),
                "unique_sources": list(sources_b)
            },
            "source_overlap_jaccard": jaccard_sources,
            "shared_sources": list(inter_sources)
        }
        
    def run_benchmark(self, top_k: int = 5) -> Dict[str, Any]:
        """
        Runs complete benchmark over all 10 curated queries and computes aggregate statistics.
        """
        query_results = []
        
        for q in BENCHMARK_QUERIES:
            res = self.compare_single_query(q["query"], top_k=top_k)
            
            # Check source relevance against expected sources
            expected = set(q["expected_sources"])
            retrieved_a = set(res["config_a"]["unique_sources"])
            retrieved_b = set(res["config_b"]["unique_sources"])
            
            hit_a = 1 if len(expected.intersection(retrieved_a)) > 0 else 0
            hit_b = 1 if len(expected.intersection(retrieved_b)) > 0 else 0
            
            row = {
                "id": q["id"],
                "topic": q["topic"],
                "query": q["query"],
                "top1_a": res["config_a"]["top1_score"],
                "top1_b": res["config_b"]["top1_score"],
                "mean_a": res["config_a"]["mean_score"],
                "mean_b": res["config_b"]["mean_score"],
                "latency_a_ms": res["config_a"]["latency_ms"],
                "latency_b_ms": res["config_b"]["latency_ms"],
                "expected_hit_a": hit_a,
                "expected_hit_b": hit_b,
                "jaccard_overlap": res["source_overlap_jaccard"],
                "shared_sources": res["shared_sources"],
                "detailed_a": res["config_a"]["results"],
                "detailed_b": res["config_b"]["results"]
            }
            query_results.append(row)
            
        df = pd.DataFrame(query_results)
        
        summary = {
            "total_queries": len(BENCHMARK_QUERIES),
            "config_a_mean_top1": round(df["top1_a"].mean(), 4),
            "config_b_mean_top1": round(df["top1_b"].mean(), 4),
            "config_a_overall_mean": round(df["mean_a"].mean(), 4),
            "config_b_overall_mean": round(df["mean_b"].mean(), 4),
            "config_a_mean_latency_ms": round(df["latency_a_ms"].mean(), 2),
            "config_b_mean_latency_ms": round(df["latency_b_ms"].mean(), 2),
            "config_a_expected_hit_rate": round(df["expected_hit_a"].mean() * 100, 1),
            "config_b_expected_hit_rate": round(df["expected_hit_b"].mean() * 100, 1),
            "mean_source_jaccard_overlap": round(df["jaccard_overlap"].mean(), 3),
            "query_details": query_results
        }
        
        return summary
