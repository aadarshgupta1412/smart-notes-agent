"""
Agent Service - Query routing and tool orchestration
Designed with lightweight abstraction for future LangGraph migration
"""
import logging
from typing import Optional
from app.models.note import Note
from app.repositories.base import BaseNoteRepository
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)


class AgentService:
    """
    Agent Service for intelligent query routing and tool orchestration
    
    Architecture Design:
    - Current: Simple keyword-based routing
    - Future-Ready: Structure allows easy migration to LangGraph for complex workflows
    - Tools are modular and can be replaced/extended
    """

    def __init__(self, repository: BaseNoteRepository, llm_service: LLMService):
        """
        Initialize agent with repository and LLM service
        
        Args:
            repository: Note repository for data access
            llm_service: LLM service for AI operations
        """
        self.repository = repository
        self.llm_service = llm_service
        logger.info("AgentService initialized")

    # ==================== Tool Definitions ====================
    # These are designed as standalone methods for easy extraction into
    # LangGraph tools or LangChain Tool objects in the future

    async def list_notes_tool(self) -> list[Note]:
        """
        Tool: Retrieve all notes from storage
        
        Returns:
            List of all notes
        """
        logger.info("Executing list_notes_tool")
        notes = await self.repository.get_all()
        logger.info(f"Retrieved {len(notes)} note(s) from repository")
        return notes

    async def summarize_tool(self, notes: list[Note], user_query: str = None) -> str:
        """
        Tool: Generate AI summary of notes
        
        Args:
            notes: List of notes to summarize
            user_query: Original user query for context (e.g., "summarize my first 3 notes")
            
        Returns:
            AI-generated summary
        """
        logger.info(f"Executing summarize_tool with {len(notes)} note(s)")
        if user_query:
            logger.info(f"User query context: '{user_query}'")
        
        if not notes:
            logger.warning("No notes available to summarize")
            return "No notes available to summarize."

        # Format notes for AI processing
        notes_text = self._format_notes_for_summary(notes)
        logger.info(f"Formatted {len(notes)} notes for LLM processing")
        
        # Call LLM service with user query context
        summary = await self.llm_service.summarize_text(notes_text, user_query=user_query)
        logger.info("Successfully generated summary from LLM")
        return summary

    # ==================== Agent Routing Logic ====================

    async def process_query(self, query: str) -> dict:
        """
        Main agent logic: Analyze query and route to appropriate tools
        
        Current Implementation: Simple keyword matching
        Future Enhancement: Can be replaced with LangGraph state machine or
                          LLM-based tool selection
        
        Args:
            query: User's natural language query
            
        Returns:
            dict with 'tools_used' and 'answer'
        """
        query_lower = query.lower()
        tools_used = []
        answer = ""
        notes = None

        logger.info(f"Processing query: '{query}'")

        # Check for summarize keyword
        if "summarize" in query_lower or "summary" in query_lower:
            logger.info("Detected 'summarize' intent")
            tools_used.append("list_notes_tool")
            notes = await self.list_notes_tool()
            
            if not notes:
                logger.warning("No notes available for summarization")
                answer = "You don't have any notes to summarize yet."
            else:
                tools_used.append("summarize_tool")
                summary = await self.summarize_tool(notes, user_query=query)
                answer = f"Summary of your notes:\n\n{summary}"

        # Check for list keyword (independent of summarize)
        if "list" in query_lower:
            # Fetch notes if not already fetched
            if notes is None:
                tools_used.append("list_notes_tool")
                notes = await self.list_notes_tool()
            
            if not notes:
                # If answer already has content (from summarize), append
                if answer:
                    answer += "\n\nYou don't have any notes to list."
                else:
                    answer = "You don't have any notes yet."
            else:
                formatted_list = self._format_notes_as_text(notes)
                # If answer already has content (from summarize), append
                if answer:
                    answer += f"\n\n---\n\nList of all your notes:\n\n{formatted_list}"
                else:
                    answer = f"Here are all your notes:\n\n{formatted_list}"

        # If no keywords matched
        if not answer:
            logger.warning(f"No matching intent found for query: '{query}'")
            answer = "I can help you list or summarize your notes. Try asking me to 'list all notes' or 'summarize my notes'."

        logger.info(f"Query processed successfully. Tools used: {tools_used}")
        
        return {
            "tools_used": tools_used,
            "answer": answer
        }

    # ==================== Streaming Support ====================

    async def process_query_stream(self, query: str):
        """
        Process query with streaming output for transparency
        
        Yields enhanced JSON objects with metadata and progress tracking
        
        Args:
            query: User's natural language query
            
        Yields:
            dict: Stream events with type, content, metadata, and timestamps
        """
        import time
        query_lower = query.lower()
        tools_used = []
        notes = None
        answer_parts = []
        start_time = time.time()

        logger.info(f"Processing streaming query: '{query}'")

        # Initial analysis
        yield {
            "type": "agent_start",
            "content": "🤖 Agent activated",
            "metadata": {
                "query": query,
                "timestamp": time.time()
            }
        }

        yield {
            "type": "reasoning",
            "content": "Analyzing your request...",
            "metadata": {
                "keywords_detected": [],
                "elapsed_ms": int((time.time() - start_time) * 1000)
            }
        }

        # Check for summarize keyword
        if "summarize" in query_lower or "summary" in query_lower:
            yield {
                "type": "reasoning",
                "content": "✓ Detected: Summarization request",
                "metadata": {
                    "intent": "summarize",
                    "confidence": "high"
                }
            }
            
            # Execute list tool
            yield {
                "type": "tool_start",
                "content": "Fetching notes from repository...",
                "metadata": {
                    "tool": "list_notes_tool",
                    "action": "read"
                }
            }
            tools_used.append("list_notes_tool")
            notes = await self.list_notes_tool()
            
            yield {
                "type": "tool_complete",
                "content": f"Retrieved {len(notes)} note(s)",
                "metadata": {
                    "tool": "list_notes_tool",
                    "count": len(notes),
                    "elapsed_ms": int((time.time() - start_time) * 1000)
                }
            }
            
            if not notes:
                answer_parts.append("You don't have any notes to summarize yet.")
            else:
                # Execute summarize tool
                yield {
                    "type": "tool_start",
                    "content": "🧠 Sending to Gemini AI for intelligent summarization...",
                    "metadata": {
                        "tool": "summarize_tool",
                        "model": "gemini-2.5-flash",
                        "notes_count": len(notes),
                        "user_query": query
                    }
                }
                tools_used.append("summarize_tool")
                
                try:
                    summary = await self.summarize_tool(notes, user_query=query)
                except Exception as e:
                    # Yield error event
                    yield {
                        "type": "llm_error",
                        "content": f"❌ AI service error: {str(e)}",
                        "metadata": {"error": str(e)}
                    }
                    summary = f"Unable to generate summary: {str(e)}"
                
                yield {
                    "type": "tool_complete",
                    "content": "✓ AI summarization complete",
                    "metadata": {
                        "tool": "summarize_tool",
                        "summary_length": len(summary),
                        "elapsed_ms": int((time.time() - start_time) * 1000)
                    }
                }
                answer_parts.append(f"Summary of your notes:\n\n{summary}")

        # Check for list keyword (independent of summarize)
        if "list" in query_lower or "show" in query_lower or "all" in query_lower:
            logger.info("Detected 'list' intent")
            yield {
                "type": "reasoning",
                "content": "✓ Detected: List request",
                "metadata": {
                    "intent": "list",
                    "confidence": "high"
                }
            }
            
            # Fetch notes if not already fetched
            if notes is None:
                yield {
                    "type": "tool_start",
                    "content": "Fetching notes from repository...",
                    "metadata": {
                        "tool": "list_notes_tool",
                        "action": "read"
                    }
                }
                tools_used.append("list_notes_tool")
                notes = await self.list_notes_tool()
                
                yield {
                    "type": "tool_complete",
                    "content": f"Retrieved {len(notes)} note(s)",
                    "metadata": {
                        "tool": "list_notes_tool",
                        "count": len(notes)
                    }
                }
            
            if not notes:
                if answer_parts:
                    answer_parts.append("You don't have any notes to list.")
                else:
                    answer_parts.append("You don't have any notes yet.")
            else:
                formatted_notes = self._format_notes_as_text(notes)
                if answer_parts:
                    answer_parts.append(f"---\n\nList of all your notes:\n\n{formatted_notes}")
                else:
                    answer_parts.append(f"Here are all your notes:\n\n{formatted_notes}")

        # If no keywords matched
        if not answer_parts:
            yield {
                "type": "reasoning",
                "content": "⚠️ No matching intent detected",
                "metadata": {
                    "intent": "unknown",
                    "suggestion": "Try 'list' or 'summarize'"
                }
            }
            answer_parts.append("I can help you list or summarize your notes. Try asking me to 'list all notes' or 'summarize my notes'.")

        # Send final answer
        final_answer = "\n\n".join(answer_parts)
        total_time = int((time.time() - start_time) * 1000)
        
        yield {
            "type": "agent_complete",
            "content": final_answer,
            "metadata": {
                "tools_used": tools_used,
                "total_time_ms": total_time,
                "timestamp": time.time()
            }
        }

        logger.info(f"Streaming query completed successfully in {total_time}ms. Tools used: {tools_used}")

    # ==================== Helper Methods ====================

    def _format_notes_for_summary(self, notes: list[Note]) -> str:
        """Format notes for AI summarization"""
        formatted = []
        for i, note in enumerate(notes, 1):
            formatted.append(f"Note {i}: {note.title}\n{note.content}")
        return "\n\n".join(formatted)

    def _format_notes_as_text(self, notes: list[Note]) -> str:
        """Format notes for human-readable display"""
        formatted = []
        for note in notes:
            formatted.append(f"• {note.title}\n  {note.content}\n  (Created: {note.created_at.strftime('%Y-%m-%d %H:%M')})")
        return "\n\n".join(formatted)

