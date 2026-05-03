"""Token usage tracking service."""
import logging
from typing import Optional
from app.db import get_supabase_client

logger = logging.getLogger(__name__)

# Simple in-memory rate limit (per-user, resets on restart)
_user_token_counts: dict[str, int] = {}
FREE_TIER_DAILY_LIMIT = 50_000  # tokens per day for free tier


async def log_usage(
    user_id: str,
    operation: str,
    provider: str,
    model: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
):
    """Log token usage to the database."""
    total = prompt_tokens + completion_tokens
    try:
        supabase = get_supabase_client()
        supabase.table("usage_logs").insert({
            "user_id": user_id,
            "operation": operation,
            "provider": provider,
            "model": model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total,
        }).execute()
    except Exception as e:
        logger.warning(f"Failed to log usage: {e}")
    
    # Update in-memory counter
    _user_token_counts[user_id] = _user_token_counts.get(user_id, 0) + total


async def check_rate_limit(user_id: str, has_own_key: bool = False) -> bool:
    """Check if user is within rate limits. Users with their own keys are unlimited."""
    if has_own_key:
        return True
    
    current = _user_token_counts.get(user_id, 0)
    return current < FREE_TIER_DAILY_LIMIT


async def get_usage_summary(user_id: str) -> dict:
    """Get usage summary for a user."""
    try:
        supabase = get_supabase_client()
        result = supabase.table("usage_logs").select("total_tokens, operation, created_at").eq("user_id", user_id).order("created_at", desc=True).limit(100).execute()
        
        total = sum(r["total_tokens"] for r in (result.data or []))
        by_operation = {}
        for r in (result.data or []):
            op = r["operation"]
            by_operation[op] = by_operation.get(op, 0) + r["total_tokens"]
        
        return {
            "total_tokens": total,
            "by_operation": by_operation,
            "daily_limit": FREE_TIER_DAILY_LIMIT,
            "remaining": max(0, FREE_TIER_DAILY_LIMIT - _user_token_counts.get(user_id, 0)),
        }
    except Exception as e:
        logger.warning(f"Failed to get usage summary: {e}")
        return {"total_tokens": 0, "by_operation": {}, "daily_limit": FREE_TIER_DAILY_LIMIT, "remaining": FREE_TIER_DAILY_LIMIT}
