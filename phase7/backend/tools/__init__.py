"""
Research Agent Tools package.
Contains search and web scraping/reading capabilities.
"""
from .search import search_web
from .reader import read_page

__all__ = ["search_web", "read_page"]
