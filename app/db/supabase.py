"""
Supabase client for database operations.
"""
import os
import logging
from functools import lru_cache
from supabase import create_client, Client

logger = logging.getLogger(__name__)


@lru_cache()
def get_supabase_client() -> Client:
    """Get a cached Supabase client instance."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) must be set")
    
    client = create_client(url, key)
    logger.info(f"Supabase client initialized: {url}")
    return client


def get_db() -> Client:
    """Dependency for FastAPI routes."""
    return get_supabase_client()
