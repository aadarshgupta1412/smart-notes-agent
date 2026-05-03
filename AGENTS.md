# Agent Memory

## Knowledge Hub (Primary Project)

### Overview

Knowledge Hub is a personal knowledge management system with:
- **Web App** (`webapp/`): Next.js 15 frontend
- **Python Backend** (`app/`): FastAPI for LLM services
- **Chrome Extension** (`extension/`): Content capture
- **Database**: Supabase (PostgreSQL + pgvector)

### Running Locally

```bash
# Start local Supabase (requires Docker)
supabase start

# Start Python backend (port 8001)
cd app && uv run uvicorn app.main:app --reload --port 8001

# Start Next.js frontend (port 3000)
cd webapp && pnpm dev
```

### Environment Setup

**Backend (`app/.env`):**
```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<from supabase start>
GOOGLE_API_KEY=<your-key>  # or OPENAI_API_KEY, AZURE_API_KEY
```

**Frontend (`webapp/.env.development.local`):**
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start>
BACKEND_API_URL=http://127.0.0.1:8001
```

### Test Credentials (Local Dev)
- Email: `test@example.com`
- Password: `password123`

### Key Technical Details

**LLM Architecture:**
- Provider-agnostic interface in `app/llm/`
- Auto-configures from env vars (Azure → Google → OpenAI)
- Embedding fallback: Azure chat + Google embeddings
- Streaming via FastAPI `StreamingResponse`

**Frontend:**
- Streamdown for AI-optimized markdown rendering
- URL-based chat routing (`/dashboard?chat=<id>`)
- Resizable/reorderable two-panel layout
- base-ui tooltips with `asChild` via `render` prop

**Design System:**
- Warm, paper-like aesthetic (no cold whites)
- WCAG AA compliant colors
- DM Sans body, JetBrains Mono code
- See `documentation/DESIGN.md`

### Common Issues

1. **Nested button hydration error**: Use `asChild` on `TooltipTrigger` or change `<button>` to `<div role="button">`
2. **Shiki version mismatch**: Install `shiki@3.23.0` for `@streamdown/code`
3. **CSS @apply with opacity**: Can't use `hover:text-primary/80` in `@apply`, use separate `:hover` rule
4. **Supabase auth error**: Ensure `auth.users` seed has all required columns including `email_change`, `recovery_token`

### Documentation

- `documentation/smart-note-agent.md` - Main README
- `documentation/DESIGN.md` - Design system
- `documentation/ARCHITECTURE.md` - System architecture
- `documentation/PRODUCT.md` - Product context

---

## Legacy: Smart Notes Agent (FastAPI Demo)

The root `app/` directory also contains a legacy FastAPI demo with in-memory storage. This is separate from the Knowledge Hub LLM backend.

**Running:**
```bash
source venv/bin/activate && uvicorn app.main:app --reload --port 8000
```

**Testing:**
```bash
pytest -v  # 15 tests, LLM calls mocked
```

Requires `GEMINI_API_KEY` in `.env` (can be dummy value for tests).
