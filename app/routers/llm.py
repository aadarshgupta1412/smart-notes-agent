"""
LLM config + chat endpoints.
"""
import logging
from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from app.llm import Provider, Tier, LLMConfig, ChatMessage, LLMClient, MODEL_REGISTRY
from app.services.ai_service import ChatService, EmbeddingService, SummaryService
from app.services.user_config_service import get_default_client, get_default_config, get_user_client
from app.services.usage_service import log_usage, check_rate_limit, get_usage_summary

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/llm", tags=["llm"])


async def _resolve_client(user_id: str = "") -> LLMClient:
    """Resolve LLM client: per-user BYOK if available, else default."""
    if user_id:
        return await get_user_client(user_id)
    client = get_default_client()
    if client is None:
        raise HTTPException(status_code=400, detail="LLM not configured. Set API keys in .env or POST /llm/config")
    return client


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
async def set_config(req: ConfigRequest, x_user_id: str = Header(alias="X-User-Id", default="")):
    """Set LLM config. With a user ID, stores per-user; otherwise updates default."""
    try:
        provider = Provider(req.provider)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {req.provider}. Options: {[p.value for p in Provider]}")

    if x_user_id:
        # Per-user config: store in DB for future use
        from app.db import get_supabase_client
        try:
            supabase = get_supabase_client()
            supabase.table("user_llm_settings").upsert({
                "user_id": x_user_id,
                "provider": provider.value,
                "api_key_encrypted": req.api_key,  # TODO: encrypt in production
                "fast_model": req.fast_model,
                "strong_model": req.strong_model,
                "embedding_model": req.embedding_model,
                "azure_endpoint": req.azure_endpoint,
                "azure_api_version": req.azure_api_version,
                "is_active": True,
            }).execute()
        except Exception as e:
            logger.error(f"Failed to save user LLM config: {e}")
            raise HTTPException(status_code=500, detail="Failed to save configuration")
    
    logger.info(f"LLM config updated: {provider.value} (user={x_user_id or 'default'})")
    return ConfigResponse(
        provider=provider.value,
        fast_model=req.fast_model,
        strong_model=req.strong_model,
        embedding_model=req.embedding_model,
    )


@router.get("/config", response_model=ConfigResponse)
async def get_config(x_user_id: str = Header(alias="X-User-Id", default="")):
    if x_user_id:
        try:
            client = await get_user_client(x_user_id)
            cfg = client.config
            return ConfigResponse(
                provider=cfg.provider.value,
                fast_model=cfg.fast_model,
                strong_model=cfg.strong_model,
                embedding_model=cfg.embedding_model,
            )
        except Exception:
            pass

    default_cfg = get_default_config()
    if default_cfg is None:
        raise HTTPException(status_code=404, detail="No LLM config set.")
    return ConfigResponse(
        provider=default_cfg.provider.value,
        fast_model=default_cfg.fast_model,
        strong_model=default_cfg.strong_model,
        embedding_model=default_cfg.embedding_model,
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


@router.get("/usage")
async def get_usage(x_user_id: str = Header(alias="X-User-Id", default="")):
    """Get token usage summary for a user."""
    if not x_user_id:
        return {"error": "User ID required"}
    return await get_usage_summary(x_user_id)


# ── Chat endpoint ─────────────────────────────────────────────────

class ChatRequest(BaseModel):
    messages: list[dict]   # [{"role": "user", "content": "..."}]
    tier: str = "fast"     # "fast" | "strong"
    context: str = ""      # RAG context injected by caller
    stream: bool = False


@router.post("/chat")
async def chat(req: ChatRequest, x_user_id: str = Header(alias="X-User-Id", default="")):
    client = await _resolve_client(x_user_id)
    service = ChatService(client)
    tier = Tier.STRONG if req.tier == "strong" else Tier.FAST
    msgs = [ChatMessage(role=m["role"], content=m["content"]) for m in req.messages]

    if req.stream:
        async def generate():
            async for chunk in service.stream_answer(msgs, context=req.context, tier=tier):
                yield chunk
        return StreamingResponse(generate(), media_type="text/plain")

    resp = await service.answer(msgs, context=req.context, tier=tier)

    if x_user_id and resp.usage:
        await log_usage(
            user_id=x_user_id,
            operation="chat",
            provider=client.config.provider.value,
            model=resp.model or client.config.fast_model,
            prompt_tokens=resp.usage.get("prompt_tokens", 0),
            completion_tokens=resp.usage.get("completion_tokens", 0),
        )

    return {"content": resp.content, "model": resp.model, "usage": resp.usage}


# ── Embedding endpoint ────────────────────────────────────────────

class EmbedRequest(BaseModel):
    text: str


@router.post("/embed")
async def embed(req: EmbedRequest, x_user_id: str = Header(alias="X-User-Id", default="")):
    client = await _resolve_client(x_user_id)
    service = EmbeddingService(client)
    vector = await service.embed(req.text)
    return {"embedding": vector, "dimensions": len(vector)}


# ── Summary endpoint ──────────────────────────────────────────────

class SummaryRequest(BaseModel):
    content: str
    max_tokens: int = 200


@router.post("/summarize")
async def summarize(req: SummaryRequest, x_user_id: str = Header(alias="X-User-Id", default="")):
    client = await _resolve_client(x_user_id)
    service = SummaryService(client)
    summary = await service.summarize(req.content, max_tokens=req.max_tokens)
    return {"summary": summary}
