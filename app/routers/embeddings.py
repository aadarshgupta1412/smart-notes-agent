"""Embedding generation endpoints."""
import logging
from fastapi import APIRouter, HTTPException, Header, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from app.services.embedding_service import generate_and_store_embedding, auto_categorize_source

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
