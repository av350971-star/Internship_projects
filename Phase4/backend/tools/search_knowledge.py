"""
Tool 1: search_knowledge
Performs read-only search over the local knowledge base.
"""
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

KB_PATH = Path(__file__).resolve().parent.parent / "data" / "knowledge_base.json"


def search_knowledge(query: str, category: Optional[str] = None, limit: int = 5) -> Dict[str, Any]:
    """
    Search articles in knowledge_base.json by query terms and optional category.
    """
    if not KB_PATH.exists():
        return {
            "query": query,
            "category": category,
            "results_count": 0,
            "results": [],
            "message": "Knowledge base repository not found."
        }

    try:
        with open(KB_PATH, "r", encoding="utf-8") as f:
            articles: List[Dict[str, Any]] = json.load(f)
    except Exception as e:
        return {
            "query": query,
            "category": category,
            "results_count": 0,
            "results": [],
            "error": f"Failed reading knowledge base: {str(e)}"
        }

    terms = query.lower().split()
    matched_articles = []

    for article in articles:
        # Category filter
        if category and article.get("category", "").lower() != category.lower():
            continue

        text_to_search = " ".join([
            article.get("title", ""),
            article.get("content", ""),
            article.get("category", ""),
            " ".join(article.get("tags", []))
        ]).lower()

        # Score by number of matching terms
        score = sum(1 for term in terms if term in text_to_search)
        if score > 0 or not terms:
            matched_articles.append({
                "id": article.get("id"),
                "title": article.get("title"),
                "category": article.get("category"),
                "content": article.get("content"),
                "score": score
            })

    # Sort by relevance score descending
    matched_articles.sort(key=lambda x: x["score"], reverse=True)
    top_results = matched_articles[:limit]

    return {
        "query": query,
        "category": category,
        "results_count": len(top_results),
        "results": top_results
    }
