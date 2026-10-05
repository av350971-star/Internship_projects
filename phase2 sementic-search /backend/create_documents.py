import os

documents = {
    "01_supervised_learning.txt": """Supervised Learning Principles and Foundations
Supervised learning is the machine learning paradigm where an algorithm learns an input-to-output mapping function from a labeled training dataset. Each training instance consists of an input vector of features and a corresponding ground-truth supervisory signal or label.
The primary mathematical objective in supervised learning is function approximation: given training pairs (x_i, y_i), find a hypothesis function h(x) that minimizes an empirical loss function while retaining generalizability to unseen test distributions.
Common tasks within supervised learning include classification, where the target label is categorical, and regression, where the target label is continuous. The inductive bias of the chosen algorithm dictates what kind of assumptions the model makes about the underlying relationship between inputs and targets. Key challenges include the bias-variance tradeoff, data distribution shifts, and label noise.""",

    "02_classification_fundamentals.txt": """Classification Fundamentals and Decision Boundaries
Classification is a predictive modeling problem where a computer program learns from data to assign categorical class labels to input feature vectors.
In binary classification, the target variable has exactly two discrete classes, such as fraud versus legitimate, spam versus ham, or benign versus malignant. In multiclass classification, the target variable belongs to one of three or more mutually exclusive classes, such as digit recognition from 0 to 9. In multilabel classification, each sample can simultaneously belong to multiple non-exclusive categories.
Classification algorithms work by partitioning the feature space into decision regions separated by decision boundaries. Linear classifiers like Perceptrons and Logistic Regression create hyperplane boundaries, while non-linear models like Decision Trees, Support Vector Machines with kernels, and Deep Neural Networks create highly flexible, non-linear decision boundaries.""",

    "03_logistic_regression.txt": """Logistic Regression and Probabilistic Modeling
Logistic regression is a fundamental linear classification algorithm used to estimate the probability that an observation belongs to a specific class. Despite its name containing regression, it is strictly used for classification.
The model applies the standard linear combination of input features weighted by learned parameters, and passes the resulting real-valued score through the sigmoid or logistic activation function. The sigmoid function squashes any real number into the bounded open interval between 0 and 1, allowing the output to be interpreted as a posterior class probability.
Optimization in logistic regression is achieved by minimizing the binary cross-entropy loss function, also known as negative log-likelihood, using gradient descent or second-order optimization techniques such as L-BFGS. Unlike linear regression, logistic regression has no closed-form analytical solution.""",

    "04_decision_trees.txt": """Decision Tree Induction and Splitting Criteria
Decision trees are non-parametric supervised learning models that predict target values by learning simple recursive decision rules inferred from data features. The internal nodes represent tests on feature attributes, branches represent outcomes of the tests, and terminal leaf nodes represent class labels or continuous predictions.
At each node, the tree algorithm greedily selects the feature and threshold that achieves the purest split. For classification, split purity is measured using impurity metrics such as Shannon Entropy, Information Gain, or the Gini Impurity index.
Decision trees are inherently interpretable and can handle both numerical and categorical data without feature scaling. However, deep unconstrained decision trees suffer from high variance and are prone to severe overfitting on noisy training data, requiring pre-pruning or post-pruning techniques.""",

    "05_random_forest.txt": """Random Forest Ensemble and Bagging Architecture
Random Forest is an ensemble learning method that constructs a multitude of decorrelated decision trees during training and aggregates their individual predictions to produce a more robust and accurate output. For classification tasks, the aggregate output is determined by majority voting.
Random Forest implements bootstrap aggregating, or bagging, where each constituent tree is trained on a distinct bootstrap sample drawn with replacement from the original dataset. Furthermore, at each split within a tree, only a random subset of input features is considered rather than the full feature space.
This dual randomness decorrelates individual trees, dramatically reducing model variance without significantly increasing bias. Random forests also provide out-of-bag (OOB) error estimation and feature importance rankings based on mean decrease in impurity.""",

    "06_support_vector_machines.txt": """Support Vector Machines and the Kernel Trick
Support Vector Machines (SVM) are maximum-margin classifiers that identify the optimal separating hyperplane which maximizes the geometric margin between data points of opposing classes. The data instances lying directly on the margin boundaries are known as support vectors, and they alone dictate the position and orientation of the decision boundary.
When datasets are not linearly separable in their original input space, SVMs leverage the kernel trick. The kernel function computes dot products in a high-dimensional implicit feature space without explicitly mapping the data coordinates, maintaining computational tractability.
Common kernel functions include the Radial Basis Function (RBF) Gaussian kernel, polynomial kernels, and sigmoid kernels. Soft-margin SVMs introduce slack variables and a regularization hyperparameter C to balance margin width against training constraint violations.""",

    "07_naive_bayes_classifier.txt": """Naive Bayes Classifier and Probabilistic Independence
The Naive Bayes classifier is a probabilistic classification model grounded in Bayes' Theorem, with the naive assumption of conditional independence between every pair of features given the class label.
Bayes' Theorem calculates the posterior probability of a class given observed evidence features by multiplying the class prior probability by the likelihood of the features given the class. Under the conditional independence assumption, the joint feature likelihood decomposes into the simple product of individual feature likelihoods.
Despite the strong and unrealistic independence assumption, Naive Bayes performs surprisingly well on text classification, spam filtering, and sentiment analysis tasks. Common variants include Multinomial Naive Bayes for discrete word count frequencies, Bernoulli Naive Bayes for binary occurrence indicators, and Gaussian Naive Bayes for continuous Gaussian-distributed variables.""",

    "08_k_nearest_neighbors.txt": """K-Nearest Neighbors Algorithm and Metric Spaces
K-Nearest Neighbors (KNN) is an instance-based, non-parametric, lazy learning algorithm that defers all generalization computation until query time. During inference, KNN identifies the k training instances geographically closest to an unseen query vector according to a distance metric.
Common distance metrics include Euclidean distance for continuous real vectors, Manhattan distance for grid-like spaces, and Minkowski distance as a generalized formulation. Once the k nearest neighbors are located, classification is performed via majority vote among their labels, often weighted inversely by distance.
KNN requires zero training time since the entire dataset serves as the model. However, inference latency scales linearly with dataset size unless spatial acceleration structures like KD-trees or Ball trees are employed. KNN is also highly sensitive to irrelevant features and the curse of dimensionality.""",

    "09_neural_networks_and_backprop.txt": """Artificial Neural Networks and Backpropagation
Artificial Neural Networks (ANN) are biologically inspired computational architectures composed of interconnected processing units called artificial neurons organized into input, hidden, and output layers. Each neuron computes a weighted sum of its inputs, adds a bias term, and applies a non-linear activation function such as ReLU, GeLU, or Sigmoid.
Training multi-layer neural networks relies on the backpropagation algorithm, which systematically applies the mathematical chain rule of calculus to compute partial derivatives of the scalar loss function with respect to every weight and bias parameter.
These computed gradients are then used by optimization algorithms like Stochastic Gradient Descent (SGD), Adam, or RMSprop to iteratively update network weights in the direction of steepest descent, minimizing the loss over training epochs.""",

    "10_convolutional_neural_networks.txt": """Convolutional Neural Networks and Spatial Representations
Convolutional Neural Networks (CNNs) are specialized deep learning architectures designed specifically for processing structured grid-like topology, such as 2D digital images and spectrograms.
Instead of relying on dense matrix multiplications with fully connected weights, CNNs introduce three foundational architectural principles: sparse interactions, parameter sharing across spatial dimensions, and equivariant representations. The core operation is the 2D spatial convolution, where learnable weight kernels slide across input channels to extract localized feature maps.
Convolutions are typically followed by non-linear activations and spatial pooling layers (such as Max Pooling or Average Pooling) which downsample spatial resolution, enlarge receptive fields, and impart translation invariance against small positional shifts.""",

    "11_recurrent_neural_networks_lstm.txt": """Recurrent Neural Networks and Long Short-Term Memory
Recurrent Neural Networks (RNNs) are designed to process sequential data, such as natural language sentences, time series measurements, and audio signals, by maintaining an internal recurrent hidden state vector that acts as memory across discrete time steps.
At each step t, the hidden state is updated using both the current input x_t and the previous hidden state h_{t-1}. However, standard vanilla RNNs suffer from vanishing and exploding gradients when trained with Backpropagation Through Time (BPTT) over long temporal horizons.
Long Short-Term Memory (LSTM) networks resolve this limitation through an internal cell state regulated by three specialized multiplicative gates: the forget gate, the input gate, and the output gate, allowing gradients to flow uninterrupted over hundreds of sequence tokens.""",

    "12_transformers_and_attention.txt": """Transformer Architecture and Multi-Head Self-Attention
The Transformer architecture, introduced in 'Attention Is All You Need', revolutionized natural language processing by replacing recurrent temporal recurrence entirely with self-attention mechanisms. This enables complete parallelization of sequence processing during model training.
The core self-attention computation operates on Query (Q), Key (K), and Value (V) matrices projected from input embeddings. The scaled dot-product attention formula computes attention weights by taking the dot product of Q and K, dividing by the square root of the key dimension d_k, applying the Softmax function, and multiplying the result by V.
Multi-Head Attention divides the projections into multiple representation subspaces, allowing the model to attend simultaneously to syntactic, semantic, and positional contexts. Positional encodings are added to input embeddings to preserve sequence order.""",

    "13_word_embeddings_word2vec.txt": """Word Embeddings and Semantic Vector Spaces
Word embeddings are dense, low-dimensional continuous vector representations of words where semantically similar words map to geometrically close coordinates in an embedding vector space. This represents a monumental leap over traditional high-dimensional sparse one-hot encodings.
Pioneered by Word2Vec, algorithms learn embeddings by exploiting the distributional hypothesis: words that occur in similar linguistic contexts tend to have similar meanings. Word2Vec features two core architectures: Continuous Bag of Words (CBOW), which predicts a target word from surrounding context words, and Skip-Gram, which predicts context words given a central target word.
In these continuous vector spaces, semantic relationships manifest as linear vector arithmetic, famously exemplified by vector('King') - vector('Man') + vector('Woman') yielding a vector strikingly close to vector('Queen').""",

    "14_vector_databases_chromadb.txt": """Vector Databases and Approximate Nearest Neighbor Search
Vector databases are specialized storage and retrieval engines engineered to persist, index, and query millions to billions of high-dimensional vector embeddings with millisecond latency.
Unlike traditional relational databases that execute exact matches on structured scalar columns, vector databases solve the Nearest Neighbor Search problem in metric vector spaces using distance metrics such as Cosine Distance, Euclidean Distance (L2), or Dot Product.
To avoid exhaustive brute-force linear scans across massive vector collections, vector databases implement Approximate Nearest Neighbor (ANN) indexing graphs, such as Hierarchical Navigable Small World (HNSW) and Inverted File Index with Product Quantization (IVF-PQ). ChromaDB is an open-source AI-native vector database designed to seamlessly store embeddings, document chunks, and structured metadata.""",

    "15_semantic_search_architecture.txt": """Semantic Search Engine Architecture and Dense Retrieval
Semantic search engines transcend lexical keyword matching (such as BM25 or TF-IDF) by understanding the conceptual intent and contextual meaning of user queries and documents.
In a modern dense retrieval pipeline without generative synthesis, the system operates in two core phases: offline indexing and online query retrieval. During offline indexing, source documents are segmented into clean chunks, passed through a pre-trained bi-encoder embedding model (such as all-MiniLM-L6-v2), and stored along with metadata in a vector database.
During online retrieval, the user's query string is converted on the fly into an embedding vector using the identical bi-encoder model. The vector database performs top-k similarity search, returning the most semantically relevant text passages, their cosine similarity scores, source document identifiers, and chunk positions for inspection.""",

    "16_evaluation_metrics_classification.txt": """Evaluation Metrics for Classification Systems
Evaluating classification performance requires metrics tailored to the problem distribution and relative cost of errors. Relying solely on raw classification accuracy can be profoundly misleading, especially in the presence of severe class imbalance.
A confusion matrix records True Positives (TP), True Negatives (TN), False Positives (FP), and False Negatives (FN). Precision measures the fraction of positive predictions that are truly correct (TP / (TP + FP)), critical in scenarios like spam filtering where false alarms carry high penalties.
Recall (or Sensitivity) measures the proportion of actual positives that the model successfully captured (TP / (TP + FN)), essential in medical diagnosis where missed cases are catastrophic. The F1-score provides the harmonic mean of precision and recall, balancing both metrics into a single unified benchmark.""",

    "17_roc_and_auc_analysis.txt": """ROC Curves and Area Under the Curve (AUC)
The Receiver Operating Characteristic (ROC) curve is a graphical evaluation tool that illustrates the diagnostic performance of a binary classifier across all possible classification decision thresholds.
The curve plots the True Positive Rate (Sensitivity) on the vertical y-axis against the False Positive Rate (1 - Specificity) on the horizontal x-axis as the probability threshold varies from 0 to 1.
The Area Under the ROC Curve (AUC-ROC) summarizes the curve into a single scalar value between 0.0 and 1.0. An AUC of 0.5 represents a worthless classifier equivalent to random coin tossing, while an AUC of 1.0 indicates perfect class separation. AUC is scale-invariant and classification-threshold-invariant, making it a robust metric for comparing probabilistic classification algorithms.""",

    "18_overfitting_and_regularization.txt": """Overfitting Prevention and Regularization Techniques
Overfitting occurs when a machine learning model learns spurious noise and idiosyncrasies in the training data rather than the underlying generalizable data generation process, resulting in near-zero training error but high test generalization error.
Regularization encompasses techniques designed to constrain model complexity. In linear and logistic models, L2 regularization (Ridge) adds the sum of squared weights to the loss function, shrinking weights toward zero and dampening extreme values. L1 regularization (Lasso) adds the sum of absolute weight values, driving unimportant weights strictly to zero and performing automatic feature selection.
In deep neural networks, common regularization methods include Dropout (randomly zeroing neuron activations during forward passes), early stopping based on validation loss, and data augmentation to artificially expand training variety.""",

    "19_unsupervised_clustering_kmeans.txt": """Unsupervised Learning and K-Means Clustering
Unsupervised learning discovers latent patterns, groupings, and underlying distributions in unlabeled datasets where no supervisory target feedback is provided.
K-Means clustering is a partition-based clustering algorithm that groups n observations into k distinct non-overlapping clusters. The algorithm begins by initializing k cluster centroids, assigns each observation to its closest centroid using Euclidean distance, and recalculates the centroids as the arithmetic mean of all points assigned to that cluster.
This two-step expectation-maximization cycle repeats until centroid positions stabilize and within-cluster sum of squares (inertia) converges. Finding the optimal number of clusters k is commonly evaluated using the Elbow Method, Silhouette Analysis, or the Davies-Bouldin index.""",

    "20_dimensionality_reduction_pca.txt": """Dimensionality Reduction and Principal Component Analysis
High-dimensional datasets frequently suffer from the curse of dimensionality, where data points become sparse, distances lose discriminative power, and model training becomes computationally prohibitive. Dimensionality reduction compresses features into lower-dimensional manifolds while preserving maximal informational variance.
Principal Component Analysis (PCA) is an orthogonal linear transformation technique that projects data onto new uncorrelated axes called principal components.
PCA first centers the data matrix, computes the empirical covariance matrix, and calculates its eigenvectors and eigenvalues. The eigenvectors determine the directions of maximal variance, while corresponding eigenvalues quantify the magnitude of variance captured. Selecting the top k eigenvectors yields a compressed representation ideal for data visualization, noise filtering, and downstream modeling."""
}

output_dir = "data/documents"
os.makedirs(output_dir, exist_ok=True)

for filename, content in documents.items():
    filepath = os.path.join(output_dir, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

print(f"Successfully generated {len(documents)} documents in {output_dir}")
