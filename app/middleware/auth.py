"""Simple API key auth for internal service-to-service calls."""
import os
from fastapi import HTTPException, Header

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "dev-internal-key")


async def verify_internal_key(x_internal_key: str = Header(alias="X-Internal-Key", default="")):
    if not x_internal_key or x_internal_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing internal API key")
