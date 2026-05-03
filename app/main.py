"""
Smart Notes Agent - FastAPI Application Entry Point
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import APP_NAME
from app.routers import notes, agent, llm, embeddings

# Initialize logger
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"{APP_NAME} is starting up...")
    try:
        from app.dependencies import initialize_services

        initialize_services()
        logger.info("All services initialized")
        logger.info(f"{APP_NAME} startup complete")
    except Exception as e:
        logger.error(f"Startup failed: {e}", exc_info=True)
        raise
    yield
    # Shutdown
    logger.info(f"{APP_NAME} is shutting down...")
    try:
        from app.dependencies import shutdown_services

        shutdown_services()
    except Exception as e:
        logger.warning(f"Error during shutdown: {e}", exc_info=True)
    logger.info("Shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=APP_NAME,
    description="AI-powered note management system with intelligent query capabilities",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Configuration (for future frontend integration)
# Currently allows all origins - restrict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(notes.router)
app.include_router(agent.router)
app.include_router(llm.router)
app.include_router(embeddings.router)


@app.get("/", tags=["root"])
async def root():
    """
    Root endpoint - API health check
    """
    logger.info("Root endpoint accessed")
    return {
        "message": f"Welcome to {APP_NAME}",
        "status": "running",
        "docs": "/docs",
        "endpoints": {"notes": "/notes", "agent": "/agent/ask"},
    }


@app.get("/health", tags=["root"])
async def health_check():
    """
    Health check endpoint for monitoring
    """
    logger.info("Health check endpoint accessed")
    return {"status": "healthy", "service": APP_NAME}


@app.get("/db-test", tags=["root"])
async def db_test():
    """
    Test Supabase database connection
    """
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

    uvicorn.run(
        "app.main:app", host="0.0.0.0", port=8000, reload=True, log_level="info"
    )
