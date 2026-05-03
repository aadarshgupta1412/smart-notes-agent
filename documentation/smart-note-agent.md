# Knowledge Hub

> Your AI-powered second brain for web content

## Quick Links

- **[Product Context](./PRODUCT.md)** - Vision, features, user journeys, roadmap
- **[Architecture](./ARCHITECTURE.md)** - System design, data flows, project structure
- **[Design System](./DESIGN.md)** - Colors, typography, components, patterns

---

## What is this?

Knowledge Hub is a personal knowledge management system with two components:

1. **Chrome Extension** - Instantly save highlights or bookmarks from any webpage
2. **Web Application** - Organize saved content and chat with AI to retrieve it

## The Core Idea

**Save once, retrieve forever—through conversation.**

Instead of searching through bookmarks or remembering where you saved something, just ask:
- "What did I save about React performance?"
- "Show me highlights from that ML article"
- "Summarize my research folder"

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
- Node.js 18+
- pnpm
- Docker Desktop (for local Supabase)
- Python 3.11+ with uv

### Web Application
```bash
cd webapp
pnpm install
pnpm dev
```

### Python Backend (LLM Services)
```bash
cd app
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

### Local Supabase
```bash
# Start local Supabase (requires Docker)
supabase start

# Reset database with seed data
supabase db reset
```

### Chrome Extension
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` folder

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (base-nova style), MagicUI, loading-ui registries
- **Markdown**: Streamdown v2 (blurIn animation, block caret, Shiki highlighting via @streamdown/code)
- **Loading**: loading-ui OrbitRing + CSS shimmer text
- **Drag & Drop**: @dnd-kit/react

### Backend
- **API Routes**: Next.js API Routes (auth, CRUD)
- **LLM Services**: Python FastAPI
- **Package Manager**: uv (Python), pnpm (Node)

### Database
- **Primary**: Supabase (PostgreSQL)
- **Vector Search**: pgvector extension
- **Auth**: Supabase Auth (Google OAuth)

### AI/LLM
- **Providers**: OpenAI, Anthropic, Google Gemini, Azure OpenAI, Mistral
- **Embeddings**: text-embedding-3-small, gemini-embedding-001
- **Architecture**: Provider-agnostic interface with auto-configuration

### Extension
- Chrome Manifest V3
- Content scripts for highlight capture

## Project Structure

```
smart-notes-agent/
├── webapp/                 # Next.js frontend
│   ├── src/
│   │   ├── app/           # App router pages, API routes, globals.css
│   │   ├── components/
│   │   │   ├── layout/    # LeftPanel, ChatPanel
│   │   │   ├── chat/      # MarkdownRenderer, PastChatsDrawer
│   │   │   ├── loading-ui/# OrbitRing, CometSpinner, TwinOrbit
│   │   │   └── ui/        # shadcn components
│   │   └── lib/           # Supabase clients, AI utils, types
│   └── package.json
├── app/                    # Python FastAPI backend
│   ├── llm/               # LLM providers & client
│   ├── routers/           # API routes
│   ├── services/          # Business logic
│   └── main.py
├── supabase/              # Database config
│   ├── migrations/        # SQL migrations
│   ├── seed.sql           # Test data
│   └── config.toml
├── extension/             # Chrome extension
└── documentation/         # Project docs
```

## Environment Variables

### Frontend (webapp/.env.development.local)
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
BACKEND_API_URL=http://127.0.0.1:8000
```

### Backend (app/.env)
```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<local-service-key>

# LLM Providers (at least one required)
GOOGLE_API_KEY=<your-key>
OPENAI_API_KEY=<your-key>
AZURE_API_KEY=<your-key>
AZURE_API_BASE=<your-endpoint>
AZURE_API_DEPLOYMENT_NAME=<your-deployment>
```

## Key Features

### Dashboard
- Two-panel layout (folders + chat)
- Drag-to-reorder panels
- Resizable panel widths
- URL-based chat routing (`/dashboard?chat=<id>`)

### Chat
- Streaming markdown responses
- @mentions for folder/source scoping
- Chat history drawer
- RAG-powered context retrieval

### Design
- Warm, paper-like aesthetic
- WCAG AA compliant colors
- Dark/light mode toggle
- No cold whites or vibrant colors

## Test Credentials (Local Dev)

```
Email: test@example.com
Password: password123
```
