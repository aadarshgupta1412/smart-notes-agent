"""
Abstract Base Repository Pattern
This ensures extensibility - future database implementations just need to inherit from this
"""
from abc import ABC, abstractmethod
from typing import Optional
from app.models.note import Note, NoteCreate, NoteUpdate


class BaseNoteRepository(ABC):
    """
    Abstract base class for Note Repository
    
    Any storage implementation (In-Memory, PostgreSQL, Supabase, MongoDB, etc.)
    must implement these methods to maintain consistency across the application.
    """

    @abstractmethod
    async def create(self, note_data: NoteCreate) -> Note:
        """
        Create a new note
        
        Args:
            note_data: Note creation data
            
        Returns:
            Created note with generated ID and timestamp
        """
        pass

    @abstractmethod
    async def get_all(self) -> list[Note]:
        """
        Retrieve all notes
        
        Returns:
            List of all notes (empty list if none exist)
        """
        pass

    @abstractmethod
    async def get_by_id(self, note_id: str) -> Optional[Note]:
        """
        Retrieve a specific note by ID
        
        Args:
            note_id: UUID of the note
            
        Returns:
            Note if found, None otherwise
        """
        pass

    @abstractmethod
    async def update(self, note_id: str, note_data: NoteUpdate) -> Optional[Note]:
        """
        Update an existing note
        
        Args:
            note_id: UUID of the note to update
            note_data: Partial or complete update data
            
        Returns:
            Updated note if found, None otherwise
        """
        pass

    @abstractmethod
    async def delete(self, note_id: str) -> bool:
        """
        Delete a note by ID
        
        Args:
            note_id: UUID of the note to delete
            
        Returns:
            True if deleted, False if not found
        """
        pass

