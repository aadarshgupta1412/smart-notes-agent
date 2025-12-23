"""
Pytest configuration and fixtures
"""
import pytest
import asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from app.main import app
from app.dependencies import initialize_services, shutdown_services
from unittest.mock import AsyncMock, patch


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
def setup_services():
    """Initialize services before tests, shutdown after"""
    # Initialize services (synchronous function)
    initialize_services()
    
    yield
    
    # Shutdown services
    shutdown_services()


@pytest.fixture
def client():
    """Synchronous test client for FastAPI"""
    return TestClient(app)


@pytest.fixture
async def async_client():
    """Async test client for streaming tests"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
def clear_notes(request):
    """Clear all notes before and after each test"""
    from app.dependencies import get_repository
    
    # Clear before test
    try:
        repo = get_repository()
        if hasattr(repo, 'clear_all'):
            repo.clear_all()
    except (RuntimeError, AttributeError):
        pass
    
    yield
    
    # Clear after test
    try:
        repo = get_repository()
        if hasattr(repo, 'clear_all'):
            repo.clear_all()
    except (RuntimeError, AttributeError):
        pass


@pytest.fixture(autouse=True)
def mock_llm_service():
    """Mock LLM service to avoid API quota issues in tests"""
    async def mock_summarize(self, text: str, user_query: str = None, retries: int = 3) -> str:
        """Mock summarization that returns a predictable response"""
        # Extract note count from text for realistic response
        note_count = text.count("Title:")
        return f"Summary: {note_count} note(s) about various topics."
    
    with patch('app.services.llm_service.LLMService.summarize_text', mock_summarize):
        yield

