"""
Smart Notes Agent - FastAPI Application Entry Point
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import APP_NAME
from app.routers import notes, agent

# Initialize logger
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title=APP_NAME,
    description="AI-powered note management system with intelligent query capabilities",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
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
        "endpoints": {
            "notes": "/notes",
            "agent": "/agent/ask"
        }
    }


@app.get("/health", tags=["root"])
async def health_check():
    """
    Health check endpoint for monitoring
    """
    logger.info("Health check endpoint accessed")
    return {
        "status": "healthy",
        "service": APP_NAME
    }


# Application startup event
@app.on_event("startup")
async def startup_event():
    """
    Execute on application startup.
    
    Initialize all singleton services here to:
    - Catch configuration errors early (fail fast)
    - Reduce first-request latency (no cold start)
    - Ensure all services are ready before accepting requests
    """
    logger.info(f"{APP_NAME} is starting up...")
    
    try:
        # Import here to avoid circular dependencies
        from app.dependencies import initialize_services
        
        # Initialize all singleton services (eager initialization)
        initialize_services()
        
        logger.info("Repository Pattern: In-Memory storage active")
        logger.info("AI Service: Google Gemini API ready")
        logger.info("API Documentation available at: /docs")
        logger.info(f"{APP_NAME} startup complete - ready to accept requests!")
        
    except Exception as e:
        logger.error(f"Startup failed: {e}", exc_info=True)
        logger.error("Application cannot start. Please check configuration and API keys.")
        raise


# Application shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """
    Execute on application shutdown.
    
    Clean up singleton services and release resources.
    """
    logger.info(f"{APP_NAME} is shutting down...")
    
    try:
        from app.dependencies import shutdown_services
        shutdown_services()
    except Exception as e:
        logger.warning(f"Error during shutdown: {e}", exc_info=True)
    
    logger.info("Shutdown complete")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

