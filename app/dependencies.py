"""
Global Dependencies and Singletons
This module provides shared instances across all routers using EAGER initialization.

Benefits:
- All services initialized at app startup (no cold start on first request)
- Errors caught early (fail fast if API keys invalid, etc.)
- Reduced latency on first request
- Predictable behavior in production
"""
import logging
from typing import Optional
from app.repositories.in_memory import InMemoryNoteRepository
from app.services.llm_service import LLMService
from app.services.agent_service import AgentService

logger = logging.getLogger(__name__)

# Singleton instances (initialized at startup, not on-demand)
_repository_instance: Optional[InMemoryNoteRepository] = None
_llm_service_instance: Optional[LLMService] = None
_agent_service_instance: Optional[AgentService] = None


def initialize_services():
    """
    Initialize all singleton services at application startup.
    
    This should be called from the FastAPI startup event.
    Ensures all services are ready before accepting requests.
    
    Raises:
        Exception: If any service fails to initialize (fail fast)
    """
    global _repository_instance, _llm_service_instance, _agent_service_instance
    
    logger.info("Initializing singleton services...")
    
    try:
        # Initialize repository
        _repository_instance = InMemoryNoteRepository()
        logger.info("✓ Repository initialized")
        
        # Initialize LLM service (this validates API key)
        _llm_service_instance = LLMService()
        logger.info("✓ LLM service initialized")
        
        # Initialize Agent service (depends on repository and LLM service)
        _agent_service_instance = AgentService(_repository_instance, _llm_service_instance)
        logger.info("✓ Agent service initialized")
        
        logger.info("All singleton services initialized successfully!")
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise


def shutdown_services():
    """
    Clean up singleton services at application shutdown.
    
    This should be called from the FastAPI shutdown event.
    """
    global _repository_instance, _llm_service_instance, _agent_service_instance
    
    logger.info("Shutting down singleton services...")
    
    # Clean up if needed (for now, just clear references)
    _agent_service_instance = None
    _llm_service_instance = None
    _repository_instance = None
    
    logger.info("Singleton services shut down")


def get_repository() -> InMemoryNoteRepository:
    """
    Get the singleton repository instance.
    
    Returns:
        InMemoryNoteRepository: The shared repository instance
        
    Raises:
        RuntimeError: If called before initialize_services()
    """
    if _repository_instance is None:
        logger.error("Repository accessed before initialization!")
        raise RuntimeError(
            "Repository not initialized. "
            "Ensure initialize_services() is called at startup."
        )
    return _repository_instance


def get_llm_service() -> LLMService:
    """
    Get the singleton LLM service instance.
    
    Returns:
        LLMService: The shared LLM service instance
        
    Raises:
        RuntimeError: If called before initialize_services()
    """
    if _llm_service_instance is None:
        logger.error("LLM service accessed before initialization!")
        raise RuntimeError(
            "LLM service not initialized. "
            "Ensure initialize_services() is called at startup."
        )
    return _llm_service_instance


def get_agent_service() -> AgentService:
    """
    Get the singleton Agent service instance.
    
    Returns:
        AgentService: The shared Agent service instance
        
    Raises:
        RuntimeError: If called before initialize_services()
    """
    if _agent_service_instance is None:
        logger.error("Agent service accessed before initialization!")
        raise RuntimeError(
            "Agent service not initialized. "
            "Ensure initialize_services() is called at startup."
        )
    return _agent_service_instance

