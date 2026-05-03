"""Test content extraction service (unit tests — no network)."""

from app.services.content_service import extract_readable_text, chunk_text, estimate_tokens


def test_extract_readable_text_basic():
    html = """
    <html><body>
    <nav>Navigation stuff</nav>
    <main>
    <h1>Article Title</h1>
    <p>This is the main content of the article that should be extracted properly.</p>
    <p>Second paragraph with more useful information about the topic.</p>
    </main>
    <footer>Footer links here</footer>
    </body></html>
    """
    text = extract_readable_text(html)
    assert "main content" in text
    assert "Navigation stuff" not in text
    assert "Footer links" not in text


def test_extract_readable_text_no_main():
    html = "<html><body><p>This is a simple page with just body content that should be extracted.</p></body></html>"
    text = extract_readable_text(html)
    assert "simple page" in text


def test_chunk_text_short():
    """Short text should return single chunk."""
    text = "Hello world, this is short."
    chunks = chunk_text(text)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_chunk_text_long():
    """Long text should be split into multiple chunks."""
    text = "This is a sentence. " * 200  # ~4000 chars
    chunks = chunk_text(text, max_chars=1000, overlap=100)
    assert len(chunks) > 1
    # Each chunk should be <= max_chars (approximately)
    for chunk in chunks:
        assert len(chunk) <= 1200  # Allow some margin for sentence boundary


def test_chunk_text_empty():
    assert chunk_text("") == []
    assert chunk_text("   ") == []


def test_estimate_tokens():
    text = "Hello world this is a test"  # 26 chars
    tokens = estimate_tokens(text)
    assert 5 <= tokens <= 10  # Roughly 6-7 tokens


def test_chunk_overlap():
    """Chunks should overlap."""
    text = "Word " * 1000  # 5000 chars
    chunks = chunk_text(text, max_chars=1000, overlap=200)
    # Check that end of chunk N appears in start of chunk N+1
    if len(chunks) > 1:
        end_of_first = chunks[0][-100:]
        assert any(end_of_first[:50] in c for c in chunks[1:3])
