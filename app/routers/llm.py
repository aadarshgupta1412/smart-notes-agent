"""
LLM config + chat endpoints.
"""
import os
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from app.llm import Provider, Tier, LLMConfig, ChatMessage, LLMClient, MODEL_REGISTRY
from app.services.ai_service import ChatService, EmbeddingService, SummaryService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/llm", tags=["llm"])

# In-memory config — in production, store per-user in DB
_active_config: Optional[LLMConfig] = None
_client: Optional[LLMClient] = None


def _init_from_env():
    """Initialize LLM client from environment variables on startup."""
    global _active_config, _client
    
    if _client is not None:
        return  # Already initialized
    
    # Try Azure OpenAI first
    azure_key = os.getenv("AZURE_API_KEY")
    azure_base = os.getenv("AZURE_API_BASE")
    azure_deployment = os.getenv("AZURE_API_DEPLOYMENT_NAME")
    
    if azure_key and azure_base and azure_deployment:
        _active_config = LLMConfig(
            provider=Provider.AZURE_OPENAI,
            api_key=azure_key,
            fast_model=azure_deployment,
            strong_model=azure_deployment,
            embedding_model="text-embedding-3-small",
            azure_endpoint=azure_base,
            azure_api_version=os.getenv("AZURE_API_VERSION", "2024-10-21"),
        )
        _client = LLMClient(_active_config)
        logger.info(f"LLM auto-configured: Azure OpenAI ({azure_deployment})")
        return
    
    # Try Google API
    google_key = os.getenv("GOOGLE_API_KEY")
    if google_key:
        _active_config = LLMConfig(
            provider=Provider.GOOGLE,
            api_key=google_key,
            fast_model="gemini-2.5-flash",
            strong_model="gemini-2.5-pro",
            embedding_model="text-embedding-004",
        )
        _client = LLMClient(_active_config)
        logger.info("LLM auto-configured: Google Gemini")
        return
    
    # Try OpenAI
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        _active_config = LLMConfig(
            provider=Provider.OPENAI,
            api_key=openai_key,
            fast_model="gpt-4o-mini",
            strong_model="gpt-4o",
            embedding_model="text-embedding-3-small",
        )
        _client = LLMClient(_active_config)
        logger.info("LLM auto-configured: OpenAI")
        return
    
    logger.warning("No LLM API keys found in environment. Configure via POST /llm/config")


# Auto-initialize on module load
_init_from_env()


def _get_client() -> LLMClient:
    if _client is None:
        raise HTTPException(status_code=400, detail="LLM not configured. Set API keys in .env or POST /llm/config")
    return _client


# ── Config endpoints ──────────────────────────────────────────────

class ConfigRequest(BaseModel):
    provider: str          # "openai" | "anthropic" | "google" | "azure_openai" | "mistral"
    api_key: str
    fast_model: str        # e.g. "gpt-4o-mini", "claude-sonnet-4-20250514"
    strong_model: str      # e.g. "gpt-4o", "claude-opus-4-20250514"
    embedding_model: str = "text-embedding-3-small"
    azure_endpoint: Optional[str] = None
    azure_api_version: str = "2024-10-21"


class ConfigResponse(BaseModel):
    provider: str
    fast_model: str
    strong_model: str
    embedding_model: str


@router.post("/config", response_model=ConfigResponse)
async def set_config(req: ConfigRequest):
    global _active_config, _client
    try:
        provider = Provider(req.provider)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {req.provider}. Options: {[p.value for p in Provider]}")

    _active_config = LLMConfig(
        provider=provider,
        api_key=req.api_key,
        fast_model=req.fast_model,
        strong_model=req.strong_model,
        embedding_model=req.embedding_model,
        azure_endpoint=req.azure_endpoint,
        azure_api_version=req.azure_api_version,
    )
    _client = LLMClient(_active_config)
    logger.info(f"LLM config updated: {provider.value}")
    return ConfigResponse(
        provider=provider.value,
        fast_model=req.fast_model,
        strong_model=req.strong_model,
        embedding_model=req.embedding_model,
    )


@router.get("/config", response_model=ConfigResponse)
async def get_config():
    if _active_config is None:
        raise HTTPException(status_code=404, detail="No LLM config set.")
    return ConfigResponse(
        provider=_active_config.provider.value,
        fast_model=_active_config.fast_model,
        strong_model=_active_config.strong_model,
        embedding_model=_active_config.embedding_model,
    )


@router.get("/models")
async def list_models():
    """Return available models grouped by provider."""
    by_provider: dict[str, list] = {}
    for key, info in MODEL_REGISTRY.items():
        by_provider.setdefault(info.provider.value, []).append({
            "id": key,
            "tier": info.tier.value,
            "context_window": info.context_window,
            "supports_streaming": info.supports_streaming,
            "supports_embeddings": info.supports_embeddings,
        })
    return by_provider


# ── Chat endpoint ─────────────────────────────────────────────────

class ChatRequest(BaseModel):
    messages: list[dict]   # [{"role": "user", "content": "..."}]
    tier: str = "fast"     # "fast" | "strong"
    context: str = ""      # RAG context injected by caller
    stream: bool = False


@router.post("/chat")
async def chat(req: ChatRequest):
    client = _get_client()
    service = ChatService(client)
    tier = Tier.STRONG if req.tier == "strong" else Tier.FAST
    msgs = [ChatMessage(role=m["role"], content=m["content"]) for m in req.messages]

    if req.stream:
        async def generate():
            async for chunk in service.stream_answer(msgs, context=req.context, tier=tier):
                yield chunk
        return StreamingResponse(generate(), media_type="text/plain")

    resp = await service.answer(msgs, context=req.context, tier=tier)
    return {"content": resp.content, "model": resp.model, "usage": resp.usage}


# ── Embedding endpoint ────────────────────────────────────────────

class EmbedRequest(BaseModel):
    text: str


@router.post("/embed")
async def embed(req: EmbedRequest):
    client = _get_client()
    service = EmbeddingService(client)
    vector = await service.embed(req.text)
    return {"embedding": vector, "dimensions": len(vector)}


# ── Summary endpoint ──────────────────────────────────────────────

class SummaryRequest(BaseModel):
    content: str
    max_tokens: int = 200


@router.post("/summarize")
async def summarize(req: SummaryRequest):
    client = _get_client()
    service = SummaryService(client)
    summary = await service.summarize(req.content, max_tokens=req.max_tokens)
    return {"summary": summary}
