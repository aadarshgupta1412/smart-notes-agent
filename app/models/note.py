"""
Note Domain Models using Pydantic
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
import uuid


class NoteBase(BaseModel):
    """Base Note schema with common fields"""
    title: str = Field(..., min_length=1, max_length=200, description="Note title")
    content: str = Field(..., min_length=1, description="Note content")


class NoteCreate(NoteBase):
    """Schema for creating a new note"""
    pass


class NoteUpdate(BaseModel):
    """Schema for updating an existing note (partial updates allowed)"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)


class Note(NoteBase):
    """Complete Note model with all fields"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "title": "Meeting Notes",
                "content": "Discussed Q4 roadmap and deliverables",
                "created_at": "2024-01-15T10:30:00"
            }
        }


class NoteResponse(Note):
    """Response model for API endpoints"""
    pass


class AgentQuery(BaseModel):
    """Schema for agent query requests"""
    query: str = Field(..., min_length=1, description="User question for the agent")

    class Config:
        json_schema_extra = {
            "example": {
                "query": "Can you summarize my notes?"
            }
        }


class AgentResponse(BaseModel):
    """Schema for agent responses"""
    tools_used: list[str] = Field(default_factory=list)
    answer: str

    class Config:
        json_schema_extra = {
            "example": {
                "tools_used": ["list_notes_tool", "summarize_tool"],
                "answer": "Here is a summary of your notes..."
            }
        }

