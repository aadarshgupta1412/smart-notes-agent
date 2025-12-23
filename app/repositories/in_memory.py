"""
In-Memory Repository Implementation
Uses Python dictionary for storage - simple but extensible
"""
import logging
from typing import Optional
from app.models.note import Note, NoteCreate, NoteUpdate
from app.repositories.base import BaseNoteRepository

logger = logging.getLogger(__name__)


class InMemoryNoteRepository(BaseNoteRepository):
    """
    In-memory implementation of Note Repository using a Python dictionary
    
    Note: Data is lost when the server restarts (as expected for in-memory storage)
    Future: Replace with SupabaseNoteRepository or PostgreSQLNoteRepository
    """

    def __init__(self):
        self._storage: dict[str, Note] = {}
        logger.info("InMemoryNoteRepository initialized")

    async def create(self, note_data: NoteCreate) -> Note:
        """Create and store a new note"""
        note = Note(**note_data.model_dump())
        self._storage[note.id] = note
        logger.info(f"Note created: {note.id}")
        return note

    async def get_all(self) -> list[Note]:
        """Retrieve all notes from storage"""
        notes = list(self._storage.values())
        logger.info(f"Retrieved {len(notes)} notes")
        return notes

    async def get_by_id(self, note_id: str) -> Optional[Note]:
        """Retrieve a single note by ID"""
        note = self._storage.get(note_id)
        if note:
            logger.info(f"Note found: {note_id}")
        else:
            logger.warning(f"Note not found: {note_id}")
        return note

    async def update(self, note_id: str, note_data: NoteUpdate) -> Optional[Note]:
        """Update an existing note with partial data"""
        note = self._storage.get(note_id)
        if not note:
            logger.warning(f"Cannot update - note not found: {note_id}")
            return None

        # Update only provided fields
        update_data = note_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(note, field, value)

        self._storage[note_id] = note
        logger.info(f"Note updated: {note_id}")
        return note

    async def delete(self, note_id: str) -> bool:
        """Delete a note from storage"""
        if note_id in self._storage:
            del self._storage[note_id]
            logger.info(f"Note deleted: {note_id}")
            return True
        logger.warning(f"Cannot delete - note not found: {note_id}")
        return False

    # Utility method for debugging (not part of the interface)
    def clear_all(self):
        """Clear all notes (useful for testing)"""
        count = len(self._storage)
        self._storage.clear()
        logger.info(f"Cleared {count} notes from storage")

