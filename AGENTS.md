## Cursor Cloud specific instructions

### Overview

Smart Notes Agent is a FastAPI backend (port 8000) with a static HTML frontend (port 3000). Uses in-memory storage (no database). See `README.md` for full architecture and API reference.

### Running services

- **Backend:** `source venv/bin/activate && uvicorn app.main:app --reload --port 8000`
- **Frontend:** `cd frontend && python3 -m http.server 3000`

### Environment

A `.env` file must exist in the project root with `GEMINI_API_KEY=<value>`. The app's `config.py` raises `ValueError` at import time if this key is missing, so even tests need it present (tests mock the LLM, but the config validation still fires during import).

For running tests without a real API key, set `GEMINI_API_KEY=dummy_key_for_testing` in `.env`.

### Testing

- `pytest -v` — runs 15 tests; all LLM calls are mocked in `tests/conftest.py`.
- 1 pre-existing test failure: `test_streaming_event_types` expects event type `"final"` but app emits `"agent_complete"`.

### Linting

No linter is configured in the repo. `ruff check .` can be used (installed in the venv). There are 8 pre-existing unused-import warnings.

### Key gotchas

- Python 3.12 works fine despite `Dockerfile` specifying 3.13.
- The `GEMINI_API_KEY` env var must be set before importing any app module (config.py validates at module load time, not at request time).
- The agent `/agent/ask` endpoint uses keyword detection ("list", "summarize") to route queries — it does not always call the Gemini API for every request.
