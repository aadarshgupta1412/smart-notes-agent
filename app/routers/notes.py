"""
Notes CRUD API Router
"""
import logging
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.note import Note, NoteCreate, NoteUpdate, NoteResponse
from app.repositories.base import BaseNoteRepository
from app.dependencies import get_repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notes", tags=["notes"])


@router.post(
    "",
    response_model=NoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new note"
)
async def create_note(
    note_data: NoteCreate,
    repository: BaseNoteRepository = Depends(get_repository)
) -> NoteResponse:
    """
    Create a new note with auto-generated ID and timestamp
    
    - **title**: Note title (required)
    - **content**: Note content (required)
    """
    try:
        logger.info(f"Creating new note: '{note_data.title}'")
        note = await repository.create(note_data)
        logger.info(f"Note created successfully with ID: {note.id}")
        return note
    except Exception as e:
        logger.error(f"Error creating note '{note_data.title}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create note"
        )


@router.get(
    "",
    response_model=list[NoteResponse],
    summary="List all notes"
)
async def list_notes(
    repository: BaseNoteRepository = Depends(get_repository)
) -> list[NoteResponse]:
    """
    Retrieve all notes from storage
    
    Returns an empty list if no notes exist
    """
    try:
        logger.info("Fetching all notes")
        notes = await repository.get_all()
        logger.info(f"Retrieved {len(notes)} note(s)")
        return notes
    except Exception as e:
        logger.error(f"Error listing notes: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve notes"
        )


@router.get(
    "/{note_id}",
    response_model=NoteResponse,
    summary="Get a specific note"
)
async def get_note(
    note_id: str,
    repository: BaseNoteRepository = Depends(get_repository)
) -> NoteResponse:
    """
    Retrieve a specific note by ID
    
    - **note_id**: UUID of the note
    
    Returns 404 if note not found
    """
    try:
        logger.info(f"Fetching note with ID: {note_id}")
        note = await repository.get_by_id(note_id)
        
        if not note:
            logger.warning(f"Note not found: {note_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Note with id {note_id} not found"
            )
        
        logger.info(f"Note retrieved successfully: {note_id}")
        return note
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving note {note_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve note"
        )


@router.put(
    "/{note_id}",
    response_model=NoteResponse,
    summary="Update a note"
)
async def update_note(
    note_id: str,
    note_data: NoteUpdate,
    repository: BaseNoteRepository = Depends(get_repository)
) -> NoteResponse:
    """
    Update an existing note (partial updates supported)
    
    - **note_id**: UUID of the note to update
    - **title**: New title (optional)
    - **content**: New content (optional)
    
    Returns 404 if note not found
    """
    try:
        logger.info(f"Updating note with ID: {note_id}")
        note = await repository.update(note_id, note_data)
        
        if not note:
            logger.warning(f"Note not found for update: {note_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Note with id {note_id} not found"
            )
        
        logger.info(f"Note updated successfully: {note_id}")
        return note
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating note {note_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update note"
        )


@router.delete(
    "/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a note"
)
async def delete_note(
    note_id: str,
    repository: BaseNoteRepository = Depends(get_repository)
):
    """
    Delete a note by ID
    
    - **note_id**: UUID of the note to delete
    
    Returns 404 if note not found
    Returns 204 No Content on successful deletion
    """
    try:
        logger.info(f"Deleting note with ID: {note_id}")
        deleted = await repository.delete(note_id)
        
        if not deleted:
            logger.warning(f"Note not found for deletion: {note_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Note with id {note_id} not found"
            )
        
        logger.info(f"Note deleted successfully: {note_id}")
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting note {note_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete note"
        )

