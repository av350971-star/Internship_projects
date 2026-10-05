"""
Web Search Tool using Search API (ddgs / DuckDuckGo).
Handles network failures, timeouts, and returns structured search results.
"""

from typing import Any
from logger import logger
from ddgs import DDGS

def search_web(query: str, max_results: int = 4) -> list[dict[str, str]]:
    """
    Search the web for query and return list of results.
    Each item contains 'title', 'href' (URL), and 'body' (snippet).
    """
    try:
        ddgs = DDGS(timeout=10)
        raw_results = ddgs.text(query, max_results=max_results)

        
        results = []
        for r in raw_results:
            url = r.get("href") or r.get("link") or ""
            title = r.get("title") or ""
            snippet = r.get("body") or r.get("snippet") or ""
            if url:
                results.append({
                    "title": title.strip(),
                    "href": url.strip(),
                    "body": snippet.strip(),
                })
        return results
    except Exception as e:
        logger.warning(f"Search API error for '{query}': {e}")
        return []
