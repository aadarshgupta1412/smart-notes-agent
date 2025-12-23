# Tests

## Run Tests

```bash
pytest -v
```

## What's Tested

**15 tests covering all specification requirements:**

- **CRUD Operations** - Create, list, get, update, delete notes with proper validation
- **Agent Routing** - Keyword-based routing (list, summarize) with correct output format
- **Streaming** - Real-time agent thought process with NDJSON events
- **Architecture** - Repository Pattern (ABC), async methods, Pydantic models

All tests use isolated fixtures to ensure clean state between runs.
