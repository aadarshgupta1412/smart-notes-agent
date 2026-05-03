"""
Service Layer Package
Contains business logic and AI integration
"""

__all__ = ["LLMService", "AgentService"]


def __getattr__(name):
    if name == "LLMService":
        from app.services.llm_service import LLMService

        return LLMService
    if name == "AgentService":
        from app.services.agent_service import AgentService

        return AgentService
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
