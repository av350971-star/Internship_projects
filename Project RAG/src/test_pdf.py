from pdf_reader import extract_pages

pdf_path = "data/Documents/classification.pdf"

count = 0

for page in extract_pages(pdf_path):
    count += 1

    if count % 10 == 0:
        print("Processed pages:", count, flush=True)

print("DONE")
print("Total pages:", count)