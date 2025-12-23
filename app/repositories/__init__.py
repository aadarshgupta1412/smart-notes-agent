"""
Repository Layer Package
Provides abstraction for data access operations
"""
from app.repositories.base import BaseNoteRepository
from app.repositories.in_memory import InMemoryNoteRepository

__all__ = ["BaseNoteRepository", "InMemoryNoteRepository"]

