from pdf_reader import extract_pages
from text_cleaner import clean_text
from chunker import chunk_text


pdf_path = "data/Documents/classification.pdf"

total_chunks = 0

for page in extract_pages(pdf_path):

    cleaned_text = clean_text(page["text"])

    chunks = chunk_text(
        cleaned_text,
        chunk_size=1000,
        overlap=200
    )

    total_chunks += len(chunks)

    print(
        f"Page {page['page_number']}: "
        f"{len(cleaned_text)} chars -> "
        f"{len(chunks)} chunks",
        flush=True
    )

print("\nDONE")
print("Total chunks:", total_chunks)