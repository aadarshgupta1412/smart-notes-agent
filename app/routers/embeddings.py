"""Embedding generation endpoints."""

import logging
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.db import get_supabase_client
from app.services.embedding_service import (
    generate_and_store_embedding,
    auto_categorize_source,
)
from app.services.content_service import extract_and_store_content

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/embeddings", tags=["embeddings"])


class EmbedSourceRequest(BaseModel):
    user_id: str
    source_id: str
    content: str
    highlight_id: Optional[str] = None


class CategorizeRequest(BaseModel):
    user_id: str
    source_id: str
    title: str
    url: str
    content_snippet: str = ""


@router.post("/generate")
async def generate_embedding(req: EmbedSourceRequest, background_tasks: BackgroundTasks):
    """Queue embedding generation for a source or highlight."""
    background_tasks.add_task(
        generate_and_store_embedding,
        user_id=req.user_id,
        source_id=req.source_id,
        content=req.content,
        highlight_id=req.highlight_id,
    )
    return {"status": "queued", "source_id": req.source_id}


@router.post("/categorize")
async def categorize_source(req: CategorizeRequest):
    """Suggest a folder for a source using LLM."""
    suggested_folder_id = await auto_categorize_source(
        user_id=req.user_id,
        source_id=req.source_id,
        title=req.title,
        url=req.url,
        content_snippet=req.content_snippet,
    )
    return {"suggested_folder_id": suggested_folder_id}


@router.get("/connections/{source_id}")
async def get_connections(
    source_id: str,
    x_user_id: str = Header(alias="X-User-Id", default=""),
):
    """Get smart connections for a source."""
    if not x_user_id:
        raise HTTPException(status_code=400, detail="X-User-Id header required")

    supabase = get_supabase_client()
    result = supabase.rpc(
        "get_source_connections",
        {
            "p_source_id": source_id,
            "p_user_id": x_user_id,
            "p_limit": 5,
        },
    ).execute()

    return {"connections": result.data or []}


class ExtractContentRequest(BaseModel):
    user_id: str
    source_id: str
    url: str


@router.post("/extract-content")
async def extract_content(req: ExtractContentRequest, background_tasks: BackgroundTasks):
    """Fetch URL content, extract text, chunk, and embed."""
    background_tasks.add_task(
        extract_and_store_content,
        user_id=req.user_id,
        source_id=req.source_id,
        url=req.url,
    )
    return {"status": "queued", "source_id": req.source_id}
