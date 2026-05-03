"""Per-user LLM configuration service."""

import os
import logging
from typing import Optional
from app.llm import Provider, LLMConfig, LLMClient
from app.db import get_supabase_client

logger = logging.getLogger(__name__)

# Default (free tier) client - initialized from env
_default_client: Optional[LLMClient] = None
_default_config: Optional[LLMConfig] = None


def get_default_client() -> Optional[LLMClient]:
    """Get the default LLM client (from env vars, for free-tier users)."""
    global _default_client, _default_config
    if _default_client:
        return _default_client

    # Try Google first
    google_key = os.getenv("GOOGLE_API_KEY")
    if google_key:
        _default_config = LLMConfig(
            provider=Provider.GOOGLE,
            api_key=google_key,
            fast_model="gemini-2.5-flash",
            strong_model="gemini-2.5-pro",
            embedding_model="text-embedding-004",
        )
        _default_client = LLMClient(_default_config)
        return _default_client

    # Try Azure OpenAI
    azure_key = os.getenv("AZURE_API_KEY")
    azure_base = os.getenv("AZURE_API_BASE")
    azure_deployment = os.getenv("AZURE_API_DEPLOYMENT_NAME")
    if azure_key and azure_base and azure_deployment:
        _default_config = LLMConfig(
            provider=Provider.AZURE_OPENAI,
            api_key=azure_key,
            fast_model=azure_deployment,
            strong_model=azure_deployment,
            embedding_model="text-embedding-3-small",
            azure_endpoint=azure_base,
            azure_api_version=os.getenv("AZURE_API_VERSION", "2024-10-21"),
        )
        _default_client = LLMClient(_default_config)
        return _default_client

    # Try OpenAI
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        _default_config = LLMConfig(
            provider=Provider.OPENAI,
            api_key=openai_key,
            fast_model="gpt-4o-mini",
            strong_model="gpt-4o",
            embedding_model="text-embedding-3-small",
        )
        _default_client = LLMClient(_default_config)
        return _default_client

    return None


def get_default_config() -> Optional[LLMConfig]:
    """Get the default config."""
    get_default_client()  # ensure initialized
    return _default_config


async def get_user_client(user_id: str) -> LLMClient:
    """Get LLM client for a specific user (BYOK or fallback to default)."""
    try:
        supabase = get_supabase_client()
        result = (
            supabase.table("user_llm_settings")
            .select("*")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .single()
            .execute()
        )

        if result.data:
            settings = result.data
            provider = Provider(settings["provider"])
            config = LLMConfig(
                provider=provider,
                api_key=settings["api_key_encrypted"],  # TODO: decrypt in production
                fast_model=settings["fast_model"],
                strong_model=settings["strong_model"],
                embedding_model=settings.get(
                    "embedding_model", "text-embedding-3-small"
                ),
                azure_endpoint=settings.get("azure_endpoint"),
                azure_api_version=settings.get("azure_api_version", "2024-10-21"),
            )
            return LLMClient(config)
    except Exception as e:
        logger.debug(f"No user config for {user_id}, using default: {e}")

    default = get_default_client()
    if not default:
        raise ValueError(
            "No LLM configuration available. Set API keys in environment or configure via settings."
        )
    return default
