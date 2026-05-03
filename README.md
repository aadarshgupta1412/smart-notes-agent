# Knowledge Hub

> AI-powered personal knowledge management — save once, retrieve forever through conversation.

## What is this?

A personal knowledge system with two parts:

1. **Chrome Extension** — Save highlights or bookmarks from any webpage into organized folders
2. **Web Application** — Chat with your saved content using AI, with RAG-powered retrieval

## How It Works

```
Capture                    Organize                   Retrieve
─────────                  ────────                   ────────
Extension saves            Auto-generates             Ask AI in
text + metadata    →       embeddings &       →       natural language
to folder                  summaries                  with @mentions
```

## Running Locally

### Prerequisites

- Node.js 18+, pnpm
- Python 3.11+, uv
- Docker Desktop (for local Supabase)

### 1. Database

```bash
supabase start
supabase db reset
```

### 2. Web Application

```bash
cd webapp
pnpm install
pnpm dev                   # → http://localhost:3000
```

### 3. Python Backend (LLM Services)

```bash
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

### 4. Chrome Extension

1. Go to `chrome://extensions`, enable Developer mode
2. Click "Load unpacked" → select `extension/` folder

### Test Credentials (Local Dev)

```
Email: test@example.com
Password: password123
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| Streaming Markdown | Streamdown v2 (blurIn animation, block caret, Shiki highlighting) |
| Loading Indicators | loading-ui registry (OrbitRing) |
| Drag & Drop | @dnd-kit/react |
| LLM Backend | Python FastAPI, provider-agnostic (OpenAI, Anthropic, Gemini, Azure, Mistral) |
| Database | Supabase (PostgreSQL + pgvector + Auth) |
| Extension | Chrome Manifest V3 |
| Package Managers | pnpm (Node), uv (Python) |

## Project Structure

```
smart-notes-agent/
├── webapp/                 # Next.js frontend + API routes
│   └── src/
│       ├── app/            # Pages, API routes, globals.css
│       ├── components/
│       │   ├── layout/     # LeftPanel, ChatPanel
│       │   ├── chat/       # MarkdownRenderer, PastChatsDrawer
│       │   ├── loading-ui/ # OrbitRing, CometSpinner, TwinOrbit
│       │   └── ui/         # shadcn components
│       └── lib/            # Supabase clients, AI utils, types
├── app/                    # Python FastAPI backend
│   ├── llm/                # Provider interface + implementations
│   ├── routers/            # /llm/* endpoints
│   └── main.py
├── supabase/               # Migrations, seed data, config
├── extension/              # Chrome extension (Manifest V3)
└── documentation/          # ARCHITECTURE.md, DESIGN.md, PRODUCT.md
```

## Environment Variables

### Frontend (`webapp/.env.development.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-key>
BACKEND_API_URL=http://127.0.0.1:8000
```

### Backend (`app/.env`)

```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<local-service-key>

# At least one LLM provider required
GOOGLE_API_KEY=<your-key>
OPENAI_API_KEY=<your-key>
AZURE_API_KEY=<your-key>
AZURE_API_BASE=<your-endpoint>
```

## Documentation

- **[Product Context](documentation/PRODUCT.md)** — Vision, features, user journeys
- **[Architecture](documentation/ARCHITECTURE.md)** — System design, data flows, API endpoints
- **[Design System](documentation/DESIGN.md)** — Colors, typography, components, animations
- **[API Testing](documentation/TEST_ALL_ENDPOINTS.md)** — cURL examples for all endpoints
