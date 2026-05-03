"""Test LLM router endpoints."""

import pytest


@pytest.mark.anyio
async def test_list_models(client):
    resp = await client.get("/llm/models")
    assert resp.status_code == 200
    data = resp.json()
    # Should have at least one provider
    assert len(data) > 0
    # Check structure
    for provider, models in data.items():
        assert isinstance(models, list)
        for model in models:
            assert "id" in model
            assert "tier" in model
            assert "context_window" in model


@pytest.mark.anyio
async def test_get_config_when_set(client):
    """Config should be available if env vars are set."""
    resp = await client.get("/llm/config")
    # Either 200 (config exists) or 404 (no config)
    assert resp.status_code in (200, 404)


@pytest.mark.anyio
async def test_chat_without_config(client):
    """Chat should work if env has API keys, fail gracefully if not."""
    resp = await client.post(
        "/llm/chat",
        json={
            "messages": [{"role": "user", "content": "say hello"}],
            "tier": "fast",
            "stream": False,
        },
    )
    # Either works (200) or no config (400)
    assert resp.status_code in (200, 400)
    if resp.status_code == 200:
        data = resp.json()
        assert "content" in data
        assert len(data["content"]) > 0


@pytest.mark.anyio
async def test_chat_streaming(client):
    """Test streaming chat endpoint."""
    resp = await client.post(
        "/llm/chat",
        json={
            "messages": [{"role": "user", "content": "say hi in one word"}],
            "tier": "fast",
            "stream": True,
        },
    )
    assert resp.status_code in (200, 400)
    if resp.status_code == 200:
        assert len(resp.text) > 0


@pytest.mark.anyio
async def test_embed_endpoint(client):
    """Test embedding endpoint."""
    resp = await client.post("/llm/embed", json={"text": "test content"})
    assert resp.status_code in (200, 400)
    if resp.status_code == 200:
        data = resp.json()
        assert "embedding" in data
        assert "dimensions" in data
        assert data["dimensions"] > 0


@pytest.mark.anyio
async def test_summarize_endpoint(client):
    """Test summarize endpoint."""
    resp = await client.post(
        "/llm/summarize",
        json={
            "content": "This is a test article about machine learning and AI.",
            "max_tokens": 50,
        },
    )
    assert resp.status_code in (200, 400)
    if resp.status_code == 200:
        data = resp.json()
        assert "summary" in data
