import re
import unicodedata


def clean_text(text: str) -> str:
    """
    Cleans raw text extracted from PDFs:
    - Normalizes Unicode characters (NFKC)
    - Fixes hyphenated line breaks (e.g. 'classifi-\n cation' -> 'classification')
    - Cleans non-printable ASCII / control characters
    - Normalizes multiple line breaks and irregular spaces
    """
    if not text:
        return ""
        
    # Normalize Unicode characters
    text = unicodedata.normalize("NFKC", text)

    # Fix words broken by hyphenation and line break
    text = re.sub(r"(\w+)-\s*\n\s*(\w+)", r"\1\2", text)
    text = re.sub(r"-\s*\n\s*", "", text)

    # Replace newlines and tabs with single space
    text = re.sub(r"[\r\n\t]+", " ", text)

    # Remove non-printable control characters except standard punctuation
    text = "".join(ch for ch in text if ch.isprintable())

    # Replace repeated whitespaces with a single space
    text = re.sub(r"\s+", " ", text)

    return text.strip()