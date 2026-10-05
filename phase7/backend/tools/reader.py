"""
Web Reading & Extraction Tool using HTTPX and BeautifulSoup.
Extracts clean, readable article content from web pages, stripping scripts, styles, and boilerplate.
Falls back to trafilatura if available.
"""

import httpx
from bs4 import BeautifulSoup
import re
from logger import logger

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def read_page(url: str, max_chars: int = 3000) -> dict[str, str]:
    """
    Fetch and extract main text content from a web page using HTTPX + BeautifulSoup.
    
    Returns:
        dict with:
            - 'text': cleaned body text (truncated to max_chars)
            - 'title': extracted page title
    """
    try:
        with httpx.Client(headers=DEFAULT_HEADERS, timeout=8.0, follow_redirects=True, verify=False) as client:
            resp = client.get(url)
            resp.raise_for_status()
            html = resp.text

        soup = BeautifulSoup(html, "html.parser")

        # Extract title
        title = ""
        if soup.title and soup.title.string:
            title = soup.title.string.strip()

        # Remove irrelevant tags
        for element in soup(["script", "style", "nav", "footer", "header", "noscript", "aside", "svg", "form"]):
            element.decompose()

        # Common web paywall / cookie boilerplate keywords to ignore
        BOILERPLATE = [
            "cookie", "subscribe", "newsletter", "sign in", "sign up", "sign-up",
            "free stories", "member-only", "loading...", "all rights reserved",
            "log in", "login", "download the app", "advertisement"
        ]

        # Extract textual content from paragraphs and headers
        blocks = []
        for tag in soup.find_all(["h1", "h2", "h3", "p"]):
            text = tag.get_text(separator=" ", strip=True)
            text_lower = text.lower()
            if len(text) > 40 and not any(bp in text_lower for bp in BOILERPLATE):
                blocks.append(text)

        body_text = "\n\n".join(blocks)

        
        # Cleanup excess whitespace
        body_text = re.sub(r"[ \t]+", " ", body_text)
        body_text = re.sub(r"\n{3,}", "\n\n", body_text).strip()

        # Fallback to trafilatura if extracted body is too short
        if len(body_text) < 150:
            try:
                import trafilatura
                downloaded = trafilatura.fetch_url(url)
                if downloaded:
                    traf_text = trafilatura.extract(downloaded) or ""
                    if len(traf_text) > len(body_text):
                        body_text = traf_text
            except Exception:
                pass

        truncated_text = body_text[:max_chars]
        return {
            "text": truncated_text,
            "title": title
        }

    except Exception as e:
        logger.warning(f"Failed to read page {url}: {e}")
        return {"text": "", "title": ""}
