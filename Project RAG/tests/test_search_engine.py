import os
import unittest
import sys

# Add src to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

from chunker import chunk_text, chunk_text_fixed, chunk_text_recursive
from text_cleaner import clean_text
from vector_store import VectorStoreManager
from evaluator import RetrievalEvaluator, BENCHMARK_QUERIES


class TestSemanticSearchEngine(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        cls.vsm = VectorStoreManager(persist_directory="results/chroma_db")
        cls.evaluator = RetrievalEvaluator(vector_store=cls.vsm)
        cls.sample_text = (
            "Convolutional Neural Networks (CNNs) are a class of artificial neural networks "
            "most commonly applied to analyze visual imagery. They use convolution operations "
            "to extract spatial hierarchies of features from input images. Max pooling layers "
            "are typically used to reduce spatial dimensions and computation."
        )
        
    def test_text_cleaner(self):
        raw = "This is a test-\n ing string with un-  \n regular   spaces \r\n and tabs."
        cleaned = clean_text(raw)
        self.assertNotIn("-\n", cleaned)
        self.assertNotIn("  ", cleaned)
        self.assertIn("testing string", cleaned)
        
    def test_chunker_config_a(self):
        chunks = chunk_text(self.sample_text, config_name="config_a", chunk_size=100, overlap=20)
        self.assertTrue(len(chunks) >= 2)
        for c in chunks:
            self.assertIn("text", c)
            self.assertIn("chunk_index", c)
            self.assertTrue(len(c["text"]) <= 100)
            
    def test_chunker_config_b(self):
        chunks = chunk_text(self.sample_text, config_name="config_b", chunk_size=150, overlap=40)
        self.assertTrue(len(chunks) >= 1)
        for c in chunks:
            self.assertIn("text", c)
            self.assertIn("chunk_index", c)
            
    def test_benchmark_queries_structure(self):
        self.assertEqual(len(BENCHMARK_QUERIES), 10)
        for q in BENCHMARK_QUERIES:
            self.assertIn("id", q)
            self.assertIn("query", q)
            self.assertIn("topic", q)
            self.assertIn("expected_sources", q)

    def test_vector_store_embedding_dimension(self):
        dim = self.vsm.embedding_dim
        self.assertEqual(dim, 384)
        vec = self.vsm.embed_query("Attention mechanism")
        self.assertEqual(len(vec), 384)

    def test_vector_store_collection_stats(self):
        stats_a = self.vsm.get_collection_stats("config_a")
        stats_b = self.vsm.get_collection_stats("config_b")
        self.assertGreater(stats_a["count"], 0)
        self.assertGreater(stats_b["count"], 0)
        self.assertGreater(stats_a["total_docs"], 0)
        self.assertIn("categories", stats_a)

    def test_vector_store_query_and_distance_scoring(self):
        results = self.vsm.query("What is self-attention?", config_key="config_a", top_k=3)
        self.assertTrue(len(results) > 0)
        for r in results:
            self.assertIn("score", r)
            self.assertIn("distance", r)
            self.assertIn("similarity_pct", r)
            self.assertIn("source_id", r)
            self.assertIn("chunk_index", r)
            self.assertIn("text", r)
            self.assertTrue(0.0 <= r["score"] <= 1.0)
            self.assertGreaterEqual(r["distance"], 0.0)

    def test_vector_store_metadata_filtering(self):
        stats = self.vsm.get_collection_stats("config_a")
        if stats["documents"]:
            target_doc = stats["documents"][0]
            filtered = self.vsm.query("Neural network layers", config_key="config_a", top_k=5, metadata_filters={"source_id": target_doc})
            for r in filtered:
                self.assertEqual(r["source_id"], target_doc)

    def test_evaluator_single_query_comparison(self):
        comp = self.evaluator.compare_single_query("What is CNN convolution?", top_k=3)
        self.assertIn("config_a", comp)
        self.assertIn("config_b", comp)
        self.assertIn("source_overlap_jaccard", comp)
        self.assertGreater(comp["config_a"]["top1_score"], 0)
        self.assertGreater(comp["config_b"]["top1_score"], 0)

    def test_pca_visualization_vectors(self):
        vis = self.vsm.get_all_vectors_for_visualization("config_a", max_samples=20)
        self.assertIn("embeddings", vis)
        self.assertIn("sources", vis)
        self.assertIn("categories", vis)
        if len(vis["embeddings"]) > 0:
            self.assertEqual(vis["embeddings"].shape[1], 384)


if __name__ == "__main__":
    unittest.main()
