"""Content extraction and chunking service.

Pipeline: URL → fetch HTML → extract readable text → chunk → embed each chunk.
"""

import logging
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from app.db import get_supabase_client

logger = logging.getLogger(__name__)

# Chunk config
MAX_CHUNK_TOKENS = 500  # ~500 tokens ≈ ~2000 chars
CHUNK_OVERLAP_CHARS = 200
MAX_CONTENT_LENGTH = 100_000  # Skip huge pages


async def fetch_url_content(url: str, timeout: float = 15.0) -> Optional[str]:
    """Fetch a URL and return raw HTML."""
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=timeout,
            headers={"User-Agent": "KnowledgeHub/1.0 (content extraction)"},
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            if "text/html" not in content_type and "text/plain" not in content_type:
                logger.info(f"Skipping non-text content: {content_type} for {url}")
                return None
            return resp.text
    except Exception as e:
        logger.warning(f"Failed to fetch {url}: {e}")
        return None


def extract_readable_text(html: str) -> str:
    """Extract main readable content from HTML, stripping nav/ads/scripts."""
    soup = BeautifulSoup(html, "html.parser")

    # Remove unwanted elements
    for tag in soup.find_all(["script", "style", "nav", "header", "footer", "aside", "iframe", "noscript"]):
        tag.decompose()

    # Try to find main content area
    main = soup.find("main") or soup.find("article") or soup.find(attrs={"role": "main"})
    if main:
        text = main.get_text(separator="\n", strip=True)
    else:
        body = soup.find("body")
        text = body.get_text(separator="\n", strip=True) if body else soup.get_text(separator="\n", strip=True)

    # Clean up whitespace
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    text = "\n".join(lines)

    # Remove very short lines that are likely navigation
    cleaned_lines = [line for line in text.split("\n") if len(line) > 20 or line.endswith((".", "!", "?", ":"))]
    return "\n".join(cleaned_lines)[:MAX_CONTENT_LENGTH]


def chunk_text(text: str, max_chars: int = 2000, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks at sentence boundaries."""
    if len(text) <= max_chars:
        return [text] if text.strip() else []

    chunks = []
    start = 0

    while start < len(text):
        end = start + max_chars

        if end >= len(text):
            chunks.append(text[start:].strip())
            break

        # Try to break at sentence boundary
        search_start = max(end - 100, start)
        last_period = text.rfind(".", search_start, end)
        last_newline = text.rfind("\n", search_start, end)
        break_at = max(last_period, last_newline)

        if break_at > start:
            end = break_at + 1

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        start = end - overlap

    return chunks


def estimate_tokens(text: str) -> int:
    """Rough token estimate (1 token ≈ 4 chars for English)."""
    return len(text) // 4


async def extract_and_store_content(
    user_id: str,
    source_id: str,
    url: str,
) -> dict:
    """Full pipeline: fetch → extract → chunk → store in DB.

    Returns dict with status info.
    """
    result = {"source_id": source_id, "status": "started", "chunks": 0, "word_count": 0}

    # 1. Fetch
    html = await fetch_url_content(url)
    if not html:
        result["status"] = "fetch_failed"
        return result

    # 2. Extract readable text
    content = extract_readable_text(html)
    if not content or len(content) < 50:
        result["status"] = "no_content"
        return result

    word_count = len(content.split())
    result["word_count"] = word_count

    # 3. Store extracted content on source
    supabase = get_supabase_client()
    try:
        supabase.table("sources").update(
            {
                "extracted_content": content[:50000],
                "content_extracted_at": "now()",
                "word_count": word_count,
            }
        ).eq("id", source_id).execute()
    except Exception as e:
        logger.error(f"Failed to update source content: {e}")

    # 4. Chunk
    chunks = chunk_text(content)
    result["chunks"] = len(chunks)

    # 5. Store chunks
    chunk_rows = []
    for i, chunk in enumerate(chunks):
        chunk_rows.append(
            {
                "user_id": user_id,
                "source_id": source_id,
                "chunk_index": i,
                "content": chunk,
                "token_count": estimate_tokens(chunk),
            }
        )

    if chunk_rows:
        try:
            supabase.table("source_chunks").delete().eq("source_id", source_id).execute()
            supabase.table("source_chunks").insert(chunk_rows).execute()
        except Exception as e:
            logger.error(f"Failed to store chunks: {e}")
            result["status"] = "chunk_store_failed"
            return result

    # 6. Trigger embedding for each chunk
    from app.services.embedding_service import generate_and_store_embedding

    embedded_count = 0
    for i, chunk in enumerate(chunks):
        success = await generate_and_store_embedding(
            user_id=user_id,
            source_id=source_id,
            content=chunk,
        )
        if success:
            embedded_count += 1

    result["embedded"] = embedded_count
    result["status"] = "complete"
    logger.info(f"Content extraction complete: source={source_id}, chunks={len(chunks)}, embedded={embedded_count}")
    return result
