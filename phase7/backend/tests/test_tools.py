from unittest.mock import patch, MagicMock
from tools.search import search_web
from tools.reader import read_page


def test_search_web_structure():
    mock_results = [
        {"title": "Test Title", "href": "https://example.com/test", "body": "Test snippet"}
    ]
    with patch("tools.search.DDGS") as MockDDGS:
        instance = MockDDGS.return_value
        instance.text.return_value = mock_results
        results = search_web("test query", max_results=1)
        assert len(results) == 1
        assert results[0]["title"] == "Test Title"
        assert results[0]["href"] == "https://example.com/test"
        assert results[0]["body"] == "Test snippet"


def test_search_web_graceful_failure():
    with patch("tools.search.DDGS") as MockDDGS:
        instance = MockDDGS.return_value
        instance.text.side_effect = Exception("Network error")
        results = search_web("failing query")
        assert results == []



def test_read_page_extraction():
    html_content = """
    <html>
        <head><title>Sample Article</title></head>
        <body>
            <script>alert('noise')</script>
            <h1>Headline of the Page</h1>
            <p>This is a factual paragraph containing detailed information about the subject matter.</p>
        </body>
    </html>
    """
    mock_resp = MagicMock()
    mock_resp.text = html_content
    mock_resp.raise_for_status.return_value = None

    with patch("httpx.Client.get", return_value=mock_resp):
        data = read_page("https://example.com/sample")
        assert data["title"] == "Sample Article"
        assert "This is a factual paragraph" in data["text"]
        assert "alert" not in data["text"]


def test_read_page_graceful_failure():
    with patch("httpx.Client.get", side_effect=Exception("HTTP connection failed")):
        data = read_page("https://invalid-url-12345.com")
        assert data["text"] == ""
        assert data["title"] == ""
