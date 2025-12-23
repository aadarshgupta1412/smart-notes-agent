Project Specification: Smart Notes Agent with Extensible Storage

1. Project Overview

Goal: Build a FastAPI backend for a "Smart Notes Agent". The system allows users to create/read notes and interact with an AI agent that can list or summarize these notes using the Google Gemini API.
Core Philosophy: The system must be built using the Repository Pattern. This ensures that the current In-Memory storage is just one implementation detail, allowing for seamless migration to a persistent database (e.g., Supabase/PostgreSQL) in the future without changing business logic or API routes.

2. Architecture & Design Patterns

2.1 Layered Architecture

The application must follow a strict separation of concerns:

Router Layer (/routers): Handles HTTP requests, input validation (Pydantic), and response formatting.

Service/Agent Layer (/services): Contains the business logic, AI interactions, and tool routing.

Repository Layer (/repositories): Abstract interface for data access.

Domain Models (/models): Pydantic models shared across layers.

2.2 The Repository Pattern (Crucial)

To satisfy the extensibility requirement, you must define an Abstract Base Class (ABC).

Interface (BaseNoteRepository): Defines methods like add_note, get_all_notes, get_note_by_id.

Implementation (InMemoryNoteRepository): Concrete implementation using a Python Dictionary.

Future Extension (Mental Check): A SupabaseNoteRepository could be created later to implement BaseNoteRepository without breaking the Service Layer.

3. Tech Stack

Language: Python 3.10+

Framework: FastAPI

AI Provider: google-generativeai (Gemini API)

Validation: Pydantic

Concurrency: Python asyncio (Critical for streaming)

4. Data Models (Domain)

Note Model

{
  "id": "uuid (string)",
  "title": "string",
  "content": "string",
  "created_at": "datetime (ISO 8601)"
}



5. Implementation Steps (Step-by-Step)

Step 1: Project Skeleton & Environment

Create a clean folder structure:

/app
  /models
  /repositories
  /routers
  /services
  main.py
.env
requirements.txt
Dockerfile



Dependencies: fastapi, uvicorn, pydantic, google-generativeai, python-dotenv.

Step 2: Define the Repository Layer

Create app/repositories/base.py:

Define an abstract class BaseRepository.

Methods: create(note), get_all(), get_by_id(note_id).

Create app/repositories/in_memory.py:

Implement BaseRepository.

Use a global Dict[str, Note] to store data.

Ensure methods are async to future-proof for real DB I/O.

Step 3: Implement Notes CRUD API

POST /notes: Accepts title and content. Generates UUID and Timestamp. Saves via Repository.

GET /notes: Retrieves all notes via Repository.

GET /notes/{id}: Retrieves specific note. Returns 404 if not found.

Step 4: AI Service Integration (Gemini)

Create app/services/llm_service.py.

Initialize genai with GEMINI_API_KEY.

Create a function summarize_text(text: str) -> str:

Prompt: "Summarize the following notes concisely: {text}"

Step 5: The Agent Logic (Routing)

Create app/services/agent_service.py.

Logic:

Receive user query.

Keyword Analysis:

If "list" in query -> Call Repository get_all().

If "summarize" in query -> Call Repository get_all(), format text, then call llm_service.summarize_text().

Else -> Return default message.

Output Format:

{
  "tools_used": ["list_notes_tool", "summarize_tool"],
  "answer": "Response string..."
}



Step 6: Streaming Implementation

Endpoint: POST /agent/ask/stream.

Mechanism: Python async generator.

Process:

Yield JSON: { "type": "thought", "content": "Analyzing request..." }

Yield JSON: { "type": "tool", "content": "Fetching notes..." }

(If summarizing) Yield JSON: { "type": "tool", "content": "Calling Gemini API..." }

Yield JSON: { "type": "final", "content": "Actual Answer" }

Use fastapi.responses.StreamingResponse with media type application/x-ndjson.

6. API Interface Specifications

1. Create Note

POST /notes

Body: {"title": "Meeting", "content": "Discussed Q4 roadmap."}

Response: 201 Created with full Note object.

2. List Notes

GET /notes

Response: 200 OK [Note, Note, ...]

3. Agent Ask (Standard)

POST /agent/ask

Body: {"query": "Summarize my notes"}

Response:

{
    "tools_used": ["list_notes_tool", "summarize_tool"],
    "answer": "The Q4 roadmap was discussed..."
}



4. Agent Ask (Streaming)

POST /agent/ask/stream

Body: {"query": "Summarize my notes"}

Response: (Stream of newline-delimited JSON objects).

7. Testing & Verification

The implementation must satisfy these Curl commands:

Setup Env:

export GEMINI_API_KEY="your_key_here"



1. Create a Note:

curl -X POST "http://localhost:8000/notes" \
     -H "Content-Type: application/json" \
     -d '{"title": "Project Alpha", "content": "Deadline is next Friday. Need to finish API."}'



2. List Notes:

curl -X GET "http://localhost:8000/notes"



3. Ask Agent (Summarize):

curl -X POST "http://localhost:8000/agent/ask" \
     -H "Content-Type: application/json" \
     -d '{"query": "Can you summarize my notes?"}'



4. Stream Agent Thought Process:

curl -N -X POST "http://localhost:8000/agent/ask/stream" \
     -H "Content-Type: application/json" \
     -d '{"query": "Summarize these notes please"}'

