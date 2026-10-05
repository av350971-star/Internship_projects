from pdf_reader import extract_pages
from text_cleaner import clean_text


pdf_path = "data/Documents/classification.pdf"


for page in extract_pages(pdf_path):

    original_text = page["text"]
    cleaned_text = clean_text(original_text)

    print("\n" + "=" * 70)
    print("PAGE:", page["page_number"])
    print("=" * 70)

    print("\nORIGINAL:")
    print(original_text[:500])

    print("\nCLEANED:")
    print(cleaned_text[:500])

    break