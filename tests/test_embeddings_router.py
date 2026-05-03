"""Test embeddings router."""

import pytest


@pytest.mark.anyio
async def test_generate_embedding_endpoint(client):
    """Test embedding generation queue endpoint."""
    resp = await client.post(
        "/embeddings/generate",
        json={
            "user_id": "test-user-id",
            "source_id": "test-source-id",
            "content": "Test content for embedding",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "queued"
    assert data["source_id"] == "test-source-id"


@pytest.mark.anyio
async def test_categorize_endpoint(client):
    """Test auto-categorize endpoint."""
    resp = await client.post(
        "/embeddings/categorize",
        json={
            "user_id": "test-user-id",
            "source_id": "test-source-id",
            "title": "Introduction to Machine Learning",
            "url": "https://example.com/ml-intro",
            "content_snippet": "Machine learning is a subset of AI...",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "suggested_folder_id" in data


@pytest.mark.anyio
async def test_extract_content_endpoint(client):
    """Test content extraction queue endpoint."""
    resp = await client.post(
        "/embeddings/extract-content",
        json={
            "user_id": "test-user-id",
            "source_id": "test-source-id",
            "url": "https://example.com",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "queued"
