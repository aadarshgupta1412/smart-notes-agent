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
| Database | Supabase (PostgreSQL + pgvector + HNSW + FTS + Auth) |
| Extension | Chrome Manifest V3 |
| Package Managers | pnpm (Node), uv (Python) |

## Features

| Feature | Description |
|---------|-------------|
| **AI Chat with RAG** | Ask questions about your saved content with source citations |
| **Auto-Embedding** | Sources and highlights are automatically embedded on save |
| **Streaming Responses** | 30ms throttled streaming with Streamdown blurIn animation |
| **Full-Text Search** | Keyword search across all content via PostgreSQL GIN indexes |
| **Batch Import** | Import bookmarks from Chrome/Firefox HTML, JSON, or CSV |
| **Tags** | Cross-folder tagging system with colors |
| **Per-User LLM Config** | BYOK (Bring Your Own Key) with rate limiting for free tier |
| **Usage Tracking** | Token counting per user, per operation |
| **Auto-Categorize** | LLM suggests folder placement for new sources |
| **Chat Management** | Rename (double-click title), delete, search history |
| **Keyboard Shortcuts** | `Cmd+N` new chat, `Cmd+K` focus input, `Esc` close |
| **Stop Generation** | Cancel streaming mid-response with AbortController |
| **Activity Digest** | Weekly/daily summary of saved content |
| **Share Collections** | Generate shareable links for folder contents |

## Project Structure

```
smart-notes-agent/
├── webapp/                 # Next.js frontend + API routes
│   └── src/
│       ├── app/            # Pages, API routes, globals.css
│       │   └── api/        # folders, sources, highlights, chats, tags, search, import, digest
│       ├── components/
│       │   ├── layout/     # LeftPanel, ChatPanel
│       │   ├── chat/       # MarkdownRenderer, PastChatsDrawer
│       │   ├── loading-ui/ # OrbitRing, CometSpinner, TwinOrbit
│       │   └── ui/         # shadcn components
│       └── lib/            # Supabase clients, AI utils, import parsers, types
├── app/                    # Python FastAPI backend
│   ├── llm/                # Provider interface + implementations
│   ├── routers/            # /llm/*, /embeddings/* endpoints
│   ├── services/           # AI, embeddings, user config, usage tracking
│   ├── middleware/         # Internal auth
│   └── main.py
├── supabase/               # Migrations (001 + 002), seed data, config
├── extension/              # Chrome extension (Manifest V3)
└── documentation/          # ARCHITECTURE.md, DESIGN.md, PRODUCT.md
```

## Environment Variables

### Frontend (`webapp/.env.development.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-key>
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
INTERNAL_API_KEY=dev-internal-key
```

### Backend (`app/.env`)

```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<local-service-key>
INTERNAL_API_KEY=dev-internal-key

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
