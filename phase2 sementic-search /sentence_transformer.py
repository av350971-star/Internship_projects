import chromadb
from sentence_transformers import SentenceTransformer


model = SentenceTransformer(
    'all-MiniLM-L6-v2'
)

client = chromadb.PersistentClient(
    path='chroma_db'
)

collection = client.get_or_create_collection(
    name='documents'
)

documents = [
    "Machine learning is a branch of artificial intelligence that allows computers to learn patterns from data.",
    "Neural networks are computational models inspired by the human brain.",
    "Backpropagation is used to calculate gradients during neural network training.",
    "Convolutional neural networks are commonly used for image classification.",
    "Transformers use attention mechanisms to process relationships between tokens."
]

embeddings = model.encode(documents).tolist()

if collection.count() == 0: 
    
    collection.add(
    ids=[str(i) for i in range(len(documents))],
    documents = documents,
    embeddings = embeddings
  )

query = 'What is Backpropagation'

query_embedding = model.encode([query]).tolist()

results = collection.query(
    query_embeddings = query_embedding,
    n_results=1
)

print(results)