import os

# Base Directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS_DIR = os.path.join(BASE_DIR, "data", "documents")
PDF_DIR = os.path.join(BASE_DIR, "pdf")
CHROMA_DIR = os.path.join(BASE_DIR, "chroma_db_v2")

# Embedding Model
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

# Chunking Configurations for Comparison
CHUNK_CONFIGS = {
    "config_a": {
        "id": "config_a",
        "name": "Config A (Small / Fine-Grained)",
        "collection_name": "semantic_chunks_config_a",
        "chunk_size": 300,
        "overlap": 50,
        "description": "Granular chunks (300 chars, 50 overlap). Higher precision for specific answers."
    },
    "config_b": {
        "id": "config_b",
        "name": "Config B (Large / Broad Context)",
        "collection_name": "semantic_chunks_config_b",
        "chunk_size": 800,
        "overlap": 150,
        "description": "Larger chunks (800 chars, 150 overlap). Captures complete paragraphs and surrounding context."
    }
}

# Document Categories Mapping (Fixed category per source file)
DOC_CATEGORIES = {
    # 20 Text Documents in data/documents/
    "01_supervised_learning.txt": "Supervised Learning",
    "02_classification_fundamentals.txt": "Classification Models",
    "03_logistic_regression.txt": "Classification Models",
    "04_decision_trees.txt": "Classification Models",
    "05_random_forest.txt": "Classification Models",
    "06_support_vector_machines.txt": "Classification Models",
    "07_naive_bayes_classifier.txt": "Classification Models",
    "08_k_nearest_neighbors.txt": "Classification Models",
    "09_neural_networks_and_backprop.txt": "Deep Learning",
    "10_convolutional_neural_networks.txt": "Deep Learning",
    "11_recurrent_neural_networks_lstm.txt": "Deep Learning",
    "12_transformers_and_attention.txt": "NLP & Embeddings",
    "13_word_embeddings_word2vec.txt": "NLP & Embeddings",
    "14_vector_databases_chromadb.txt": "Information Retrieval",
    "15_semantic_search_architecture.txt": "Information Retrieval",
    "16_evaluation_metrics_classification.txt": "Model Evaluation",
    "17_roc_and_auc_analysis.txt": "Model Evaluation",
    "18_overfitting_and_regularization.txt": "Regularization",
    "19_unsupervised_clustering_kmeans.txt": "Unsupervised Learning",
    "20_dimensionality_reduction_pca.txt": "Unsupervised Learning",
    
    # PDF Document
    "classification.pdf": "Classification (PDF)"
}

def get_doc_category(filename: str) -> str:
    """
    Returns the category for a given document file.
    Category is per SOURCE FILE, never per page.
    Unknown/uploaded files get 'Uncategorized'.
    """
    clean_name = os.path.basename(filename)
    return DOC_CATEGORIES.get(clean_name, "Uncategorized")


# Hand-Written Benchmark Query Set for Chunking Comparison (10 Hand-Written Queries)
BENCHMARK_QUERIES = [
    {
        "id": "q1",
        "query": "How does backpropagation update weights in a neural network using gradients?",
        "expected_topics": ["Neural Networks", "Backpropagation", "Gradients"],
        "expected_sources": ["09_neural_networks_and_backprop.txt"],
        "category": "Deep Learning",
        "is_paraphrased": False
    },
    {
        "id": "q2",
        "query": "What is the difference between precision and recall in classification?",
        "expected_topics": ["Classification", "Evaluation Metrics", "Precision", "Recall"],
        "expected_sources": ["16_evaluation_metrics_classification.txt", "classification.pdf"],
        "category": "Model Evaluation",
        "is_paraphrased": False
    },
    {
        "id": "q3",
        "query": "Explain how the self-attention mechanism works in Transformer models",
        "expected_topics": ["Transformers", "Attention", "Query Key Value"],
        "expected_sources": ["12_transformers_and_attention.txt"],
        "category": "NLP & Embeddings",
        "is_paraphrased": False
    },
    {
        "id": "q4",
        "query": "What is the kernel trick in Support Vector Machines and why is it used?",
        "expected_topics": ["SVM", "Kernel Trick", "Hyperplane"],
        "expected_sources": ["06_support_vector_machines.txt"],
        "category": "Classification Models",
        "is_paraphrased": False
    },
    {
        "id": "q5",
        "query": "How do L1 and L2 regularization prevent overfitting?",
        "expected_topics": ["Overfitting", "Regularization", "L1 Lasso", "L2 Ridge"],
        "expected_sources": ["18_overfitting_and_regularization.txt"],
        "category": "Regularization",
        "is_paraphrased": False
    },
    {
        "id": "q6",
        "query": "How do vector databases perform approximate nearest neighbor search?",
        "expected_topics": ["Vector Databases", "Embeddings", "Nearest Neighbor", "ChromaDB"],
        "expected_sources": ["14_vector_databases_chromadb.txt", "15_semantic_search_architecture.txt"],
        "category": "Information Retrieval",
        "is_paraphrased": False
    },
    {
        "id": "q7",
        "query": "How does K-Means cluster unlabeled data using centroids?",
        "expected_topics": ["Clustering", "K-Means", "Centroids", "Unsupervised"],
        "expected_sources": ["19_unsupervised_clustering_kmeans.txt"],
        "category": "Unsupervised Learning",
        "is_paraphrased": False
    },
    # 3 Paraphrased queries with minimal keyword overlap (Demonstrating true semantic dense retrieval)
    {
        "id": "q8",
        "query": "Squashing unbounded real numbers into probabilities between 0 and 1 for binary decisions",
        "expected_topics": ["Sigmoid", "Probabilistic Modeling", "Logistic Regression"],
        "expected_sources": ["03_logistic_regression.txt", "classification.pdf"],
        "category": "Classification Models",
        "is_paraphrased": True
    },
    {
        "id": "q9",
        "query": "Mapping words into geometric coordinates where words in similar contexts cluster together",
        "expected_topics": ["Distributional Hypothesis", "Word Embeddings", "Vector Space"],
        "expected_sources": ["13_word_embeddings_word2vec.txt"],
        "category": "NLP & Embeddings",
        "is_paraphrased": True
    },
    {
        "id": "q10",
        "query": "Splitting data recursively to maximize node purity using entropy or impurity metrics",
        "expected_topics": ["Decision Trees", "Entropy", "Gini Impurity"],
        "expected_sources": ["04_decision_trees.txt", "classification.pdf"],
        "category": "Classification Models",
        "is_paraphrased": True
    }
]
