"""
AI Agent API Router
Handles intelligent query routing and streaming responses
"""
import logging
import json
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from app.models.note import AgentQuery, AgentResponse
from app.services.agent_service import AgentService
from app.dependencies import get_agent_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post(
    "/ask",
    response_model=AgentResponse,
    summary="Ask the agent a question"
)
async def ask_agent(
    query: AgentQuery,
    agent: AgentService = Depends(get_agent_service)
) -> AgentResponse:
    """
    Query the AI agent about your notes
    
    The agent can:
    - List all notes (keywords: "list", "show", "all")
    - Summarize notes using AI (keywords: "summarize", "summary")
    
    Example queries:
    - "Can you list all my notes?"
    - "Summarize my notes"
    - "Show me what I have"
    """
    try:
        logger.info(f"Agent query received: '{query.query}'")
        result = await agent.process_query(query.query)
        logger.info(f"Agent query processed successfully. Tools used: {result.get('tools_used', [])}")
        return AgentResponse(**result)
    except Exception as e:
        logger.error(f"Error processing agent query '{query.query}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process query: {str(e)}"
        )


@router.post(
    "/ask/stream",
    summary="Ask the agent with streaming response"
)
async def ask_agent_stream(
    query: AgentQuery,
    agent: AgentService = Depends(get_agent_service)
):
    """
    Query the AI agent with real-time streaming of the thought process
    
    Returns newline-delimited JSON (NDJSON) stream with events:
    - **thought**: Agent's reasoning steps
    - **tool**: Tool execution updates
    - **final**: Final answer
    
    Example usage with curl:
    ```
    curl -N -X POST "http://localhost:8000/agent/ask/stream" \\
         -H "Content-Type: application/json" \\
         -d '{"query": "Summarize my notes"}'
    ```
    """
    try:
        logger.info(f"Streaming agent query received: '{query.query}'")
        
        async def event_generator():
            """Generate streaming events"""
            try:
                event_count = 0
                async for event in agent.process_query_stream(query.query):
                    # Format as newline-delimited JSON
                    yield json.dumps(event) + "\n"
                    event_count += 1
                logger.info(f"Streaming query completed. Generated {event_count} events")
            except Exception as e:
                logger.error(f"Error in stream for query '{query.query}': {e}", exc_info=True)
                error_event = {
                    "type": "error",
                    "content": f"An error occurred: {str(e)}"
                }
                yield json.dumps(error_event) + "\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="application/x-ndjson"
        )
    
    except Exception as e:
        logger.error(f"Error setting up stream for query '{query.query}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process streaming query: {str(e)}"
        )

