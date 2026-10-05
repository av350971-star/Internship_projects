
import re
import chromadb
import fitz  
import pytesseract
from PIL import Image
import io
import time as t

from sentence_transformers import SentenceTransformer



model = SentenceTransformer("all-MiniLM-L6-v2")



pdf_path = "pdf/classification.pdf"

pdf = fitz.open(pdf_path)

all_pages = []

for page_number, page in enumerate(pdf):

      
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))

    img = Image.open(
        io.BytesIO(pix.tobytes("png"))
    )

    
    text = pytesseract.image_to_string(img)

    all_pages.append({
        "page": page_number + 1,
        "text": text
    })


print("Total pages:", len(all_pages))



def clean_text(text):

    # Multiple spaces -> single space
    text = re.sub(r"[ \t]+", " ", text)

    # Too many new lines -> normal new lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Remove spaces around new lines
    text = re.sub(r" *\n *", "\n", text)

    return text.strip()


for page in all_pages:
    page["text"] = clean_text(page["text"])




all_pages = [
    page for page in all_pages
    if page["text"]
]

print("Pages containing text:", len(all_pages))




def create_chunks(text, chunk_size=800, overlap=150):

    chunks = []

    start = 0

    while start < len(text):

        end = start + chunk_size

        chunk = text[start:end]

        chunks.append(chunk)

        start += chunk_size - overlap

    return chunks


documents = []
metadatas = []
ids = []

chunk_id = 0

for page in all_pages:

    chunks = create_chunks(page["text"])

    for chunk in chunks:

        documents.append(chunk)

        metadatas.append({
            "page": page["page"],
            "source": pdf_path
        })

        ids.append(str(chunk_id))

        chunk_id += 1


print("Total chunks:", len(documents))



embeddings = model.encode(
    documents,
    show_progress_bar=True
).tolist()



client = chromadb.PersistentClient(
    path="chroma_db"
)

collection = client.get_or_create_collection(
    name="classification"
)



existing_count = collection.count()

if existing_count == 0:

    collection.add(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas
    )

    print("Documents added to ChromaDB.")

else:

    print("Collection already contains documents.")
    print("Skipping insertion.")




start = t.time()

query = "What is classification in machine learning"

query_embedding = model.encode(
    [query]
).tolist()


results = collection.query(
    query_embeddings=query_embedding,
    n_results=5
)

end = t.time()

print("\n===== SEARCH RESULTS =====\n")

# print(results)

for i, document in enumerate(results["documents"][0]):

    print("Result:", i + 1)

    print("Page:",
         results["metadatas"][0][i]["page"])
    
    print(f"time taken :- {end - start:.2f} sec ")
    
    print("Distance:", results["distances"][0][i])
    print("Text:")
    print(document)
    
   
    
    print("-" * 60)

