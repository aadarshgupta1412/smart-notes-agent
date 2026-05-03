"""Background embedding generation service."""

import logging
from typing import Optional
from app.db import get_supabase_client
from app.llm import LLMClient, LLMConfig, Provider
import os

logger = logging.getLogger(__name__)


def _get_embedding_client() -> Optional[LLMClient]:
    """Get an LLM client configured for embeddings."""
    google_key = os.getenv("GOOGLE_API_KEY")
    if google_key:
        config = LLMConfig(
            provider=Provider.GOOGLE,
            api_key=google_key,
            fast_model="gemini-2.5-flash",
            strong_model="gemini-2.5-pro",
            embedding_model="text-embedding-004",
        )
        return LLMClient(config)

    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        config = LLMConfig(
            provider=Provider.OPENAI,
            api_key=openai_key,
            fast_model="gpt-4o-mini",
            strong_model="gpt-4o",
            embedding_model="text-embedding-3-small",
        )
        return LLMClient(config)
    return None


async def generate_and_store_embedding(
    user_id: str,
    source_id: str,
    content: str,
    highlight_id: Optional[str] = None,
) -> bool:
    """Generate embedding for content and store in database."""
    client = _get_embedding_client()
    if not client:
        logger.warning("No embedding client available")
        return False

    try:
        vector = await client.embed(content[:8000])
        supabase = get_supabase_client()

        row = {
            "user_id": user_id,
            "source_id": source_id,
            "content": content[:2000],
            "dimensions": len(vector),
        }
        if highlight_id:
            row["highlight_id"] = highlight_id

        if len(vector) <= 768:
            row["embedding_768"] = vector
        else:
            row["embedding"] = vector

        supabase.table("embeddings").insert(row).execute()
        logger.info(f"Stored embedding for source={source_id}, dims={len(vector)}")
        return True
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        return False


async def auto_categorize_source(
    user_id: str,
    source_id: str,
    title: str,
    url: str,
    content_snippet: str = "",
) -> Optional[str]:
    """Use LLM to suggest a folder for a new source."""
    client = _get_embedding_client()
    if not client:
        return None

    try:
        supabase = get_supabase_client()
        result = (
            supabase.table("folders")
            .select("id, name")
            .eq("user_id", user_id)
            .execute()
        )
        folders = result.data or []

        if not folders:
            return None

        folder_list = "\n".join([f"- {f['name']} (id: {f['id']})" for f in folders])

        from app.llm.types import ChatMessage

        messages = [
            ChatMessage(
                role="system",
                content="You are a categorization assistant. Given a URL and title, suggest which folder it belongs to. Reply with ONLY the folder id, nothing else. If none fit well, reply 'none'.",
            ),
            ChatMessage(
                role="user",
                content=f"Title: {title}\nURL: {url}\nSnippet: {content_snippet[:500]}\n\nAvailable folders:\n{folder_list}",
            ),
        ]

        from app.llm.types import Tier

        response = await client.chat(messages, tier=Tier.FAST)
        suggested_id = response.content.strip()

        valid_ids = {f["id"] for f in folders}
        if suggested_id in valid_ids:
            return suggested_id
        return None
    except Exception as e:
        logger.error(f"Auto-categorize failed: {e}")
        return None
