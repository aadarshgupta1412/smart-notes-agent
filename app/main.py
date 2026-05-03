"""
Smart Notes Agent - FastAPI Application Entry Point
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import APP_NAME
from app.routers import llm, embeddings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"{APP_NAME} is starting up...")
    logger.info(f"{APP_NAME} startup complete")
    yield
    logger.info(f"{APP_NAME} is shutting down...")
    logger.info("Shutdown complete")


app = FastAPI(
    title=APP_NAME,
    description="LLM gateway for the Smart Notes application",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(llm.router)
app.include_router(embeddings.router)


@app.get("/", tags=["root"])
async def root():
    """Root endpoint - API health check"""
    return {
        "message": f"Welcome to {APP_NAME}",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["root"])
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy", "service": APP_NAME}


@app.get("/db-test", tags=["root"])
async def db_test():
    """Test Supabase database connection"""
    try:
        from app.db import get_supabase_client

        client = get_supabase_client()
        result = client.table("profiles").select("id, email, name").limit(5).execute()
        return {
            "status": "connected",
            "profiles_count": len(result.data),
            "profiles": result.data,
        }
    except Exception as e:
        logger.error(f"Database test failed: {e}")
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
