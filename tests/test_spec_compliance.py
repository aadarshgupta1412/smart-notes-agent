"""
Specification Compliance Tests

Verifies all core requirements from smart-note-agent.md specification
"""
import pytest
import uuid
from datetime import datetime


class TestSpecCompliance:
    """Tests verifying specification requirements"""
    
    # ============ CRUD Tests (5 essential) ============
    
    def test_create_note_with_uuid_and_timestamp(self, client):
        """Requirement: POST /notes generates UUID and timestamp"""
        response = client.post(
            "/notes",
            json={"title": "Test", "content": "Content"}
        )
        
        assert response.status_code == 201
        data = response.json()
        
        # Verify UUID
        uuid.UUID(data["id"])
        
        # Verify timestamp
        datetime.fromisoformat(data["created_at"])
        
        assert data["title"] == "Test"
        assert data["content"] == "Content"
    
    def test_list_all_notes(self, client):
        """Requirement: GET /notes returns all notes"""
        # Explicitly clear to ensure clean state
        from app.dependencies import get_repository
        repo = get_repository()
        repo.clear_all()
        
        # Create notes
        client.post("/notes", json={"title": "Note 1", "content": "Content 1"})
        client.post("/notes", json={"title": "Note 2", "content": "Content 2"})
        
        response = client.get("/notes")
        
        assert response.status_code == 200
        notes = response.json()
        assert len(notes) == 2, f"Expected 2 notes, got {len(notes)}: {notes}"
    
    def test_get_note_by_id(self, client):
        """Requirement: GET /notes/{id} returns specific note"""
        create_resp = client.post("/notes", json={"title": "Test", "content": "Test"})
        note_id = create_resp.json()["id"]
        
        response = client.get(f"/notes/{note_id}")
        
        assert response.status_code == 200
        assert response.json()["id"] == note_id
    
    def test_get_note_404(self, client):
        """Requirement: Returns 404 if note not found"""
        response = client.get(f"/notes/{uuid.uuid4()}")
        assert response.status_code == 404
    
    def test_pydantic_validation(self, client):
        """Requirement: Pydantic validates input"""
        response = client.post("/notes", json={"title": "No content"})
        assert response.status_code == 422
    
    # ============ Agent Tests (4 essential) ============
    
    def test_agent_list_keyword(self, client):
        """Requirement: "list" keyword triggers list_notes_tool"""
        client.post("/notes", json={"title": "Test", "content": "Test"})
        
        response = client.post("/agent/ask", json={"query": "list my notes"})
        
        assert response.status_code == 200
        data = response.json()
        assert "list_notes_tool" in data["tools_used"]
        assert "Test" in data["answer"]
    
    def test_agent_summarize_keyword(self, client):
        """Requirement: "summarize" triggers list + summarize tools"""
        client.post("/notes", json={"title": "Test", "content": "Test content"})
        
        response = client.post("/agent/ask", json={"query": "summarize my notes"})
        
        assert response.status_code == 200
        data = response.json()
        assert "list_notes_tool" in data["tools_used"]
        assert "summarize_tool" in data["tools_used"]
    
    def test_agent_output_format(self, client):
        """Requirement: Output format has tools_used and answer"""
        response = client.post("/agent/ask", json={"query": "list notes"})
        
        data = response.json()
        assert "tools_used" in data
        assert "answer" in data
        assert isinstance(data["tools_used"], list)
        assert isinstance(data["answer"], str)
    
    def test_agent_default_message(self, client):
        """Requirement: Unrecognized queries return default message"""
        response = client.post("/agent/ask", json={"query": "random query"})
        
        data = response.json()
        assert len(data["tools_used"]) == 0
        assert "list" in data["answer"].lower() or "summarize" in data["answer"].lower()
    
    # ============ Streaming Tests (3 essential) ============
    
    @pytest.mark.asyncio
    async def test_streaming_endpoint(self, async_client):
        """Requirement: POST /agent/ask/stream exists"""
        response = await async_client.post(
            "/agent/ask/stream",
            json={"query": "list notes"}
        )
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_streaming_ndjson_format(self, async_client):
        """Requirement: Uses application/x-ndjson"""
        response = await async_client.post(
            "/agent/ask/stream",
            json={"query": "list notes"}
        )
        
        content_type = response.headers.get("content-type", "")
        assert "application/x-ndjson" in content_type
    
    @pytest.mark.asyncio
    async def test_streaming_event_types(self, async_client):
        """Requirement: Events have type and content"""
        import json
        
        response = await async_client.post(
            "/agent/ask/stream",
            json={"query": "list notes"}
        )
        
        lines = [line for line in response.text.strip().split('\n') if line]
        events = [json.loads(line) for line in lines]
        
        # Should have events
        assert len(events) > 0
        
        # Each event has type and content
        for event in events:
            assert "type" in event
            assert "content" in event
        
        # Should have final event
        assert events[-1]["type"] == "final"
    
    # ============ Architecture Tests (3 essential) ============
    
    def test_repository_pattern_abc(self):
        """Requirement: Repository Pattern with ABC"""
        from abc import ABC
        from app.repositories.base import BaseNoteRepository
        from app.repositories.in_memory import InMemoryNoteRepository
        
        assert issubclass(BaseNoteRepository, ABC)
        assert issubclass(InMemoryNoteRepository, BaseNoteRepository)
    
    def test_repository_methods_async(self):
        """Requirement: Repository methods are async"""
        import inspect
        from app.repositories.in_memory import InMemoryNoteRepository
        
        repo = InMemoryNoteRepository()
        assert inspect.iscoroutinefunction(repo.create)
        assert inspect.iscoroutinefunction(repo.get_all)
    
    def test_pydantic_models(self):
        """Requirement: Pydantic models for validation"""
        from pydantic import BaseModel
        from app.models.note import Note, NoteCreate
        
        assert issubclass(Note, BaseModel)
        assert issubclass(NoteCreate, BaseModel)

