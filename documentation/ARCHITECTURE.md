# Knowledge Hub - Architecture

## System Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                            CLIENTS                                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Chrome Extension                    Web Application                   │
│   ├── Capture text/bookmarks          ├── Dashboard (folders, sources)  │
│   ├── Folder selection                ├── AI Chat interface             │
│   └── Google OAuth (Identity API)     └── Google OAuth (Supabase)       │
│                                                                         │
└───────────────────────────────┬────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
┌───────────────────────────────┐   ┌───────────────────────────────────┐
│     NEXT.JS API LAYER         │   │     PYTHON FASTAPI BACKEND        │
├───────────────────────────────┤   ├───────────────────────────────────┤
│                               │   │                                   │
│   Auth Routes                 │   │   LLM Routes                      │
│   ├── /auth/callback          │   │   ├── POST /llm/chat (streaming)  │
│   └── /auth/extension         │   │   ├── POST /llm/embed             │
│                               │   │   ├── POST /llm/summarize         │
│   Data Routes                 │   │   ├── GET /llm/config             │
│   ├── /folders/*              │   │   └── POST /llm/config            │
│   ├── /sources/*              │   │                                   │
│   ├── /highlights/*           │   │   Provider Interface              │
│   └── /chats/*                │   │   ├── OpenAI                      │
│                               │   │   ├── Anthropic                   │
└───────────────────────────────┘   │   ├── Google Gemini               │
                                    │   ├── Azure OpenAI                │
                                    │   └── Mistral                     │
                                    └───────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Supabase                    LLM Providers                             │
│   ├── PostgreSQL + pgvector   ├── OpenAI (GPT-4o, embeddings)          │
│   ├── Auth (sessions)         ├── Anthropic (Claude Opus/Sonnet)       │
│   └── Row-level security      ├── Google (Gemini 2.5/3.x)              │
│                               ├── Azure OpenAI                          │
│                               └── Mistral                               │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Capture Flow (Extension → Database)

```
User selects text → Extension captures {url, title, content, metadata}
                           ↓
              POST /api/sources with Bearer token
                           ↓
         ┌─────────────────┴─────────────────┐
         ↓                                   ↓
   Insert source record              (async, fire-and-forget)
   Insert highlight (if any)         ├── Generate embedding → store
                                     └── Generate summary → store
```

### 2. Retrieval Flow (Chat → RAG → Response)

```
User asks question (+ optional @folder/@source filters)
                           ↓
              POST /api/chats/[id]/messages
                           ↓
              Call Python backend: POST /llm/embed
                           ↓
         Vector similarity search (match_embeddings RPC)
         Filtered by: user_id, folder_ids, source_ids
                           ↓
         Fetch source metadata for top matches
                           ↓
         Build context: "[Source: Title]\nContent..."
                           ↓
         Call Python backend: POST /llm/chat (streaming)
                           ↓
         Stream response back to client
```

---

## LLM Provider Architecture

### Provider Interface

```python
# Each provider implements these functions:
async def chat(api_key, model, messages, **kwargs) -> str
async def stream_chat(api_key, model, messages, **kwargs) -> AsyncIterator[str]
async def embed(api_key, model, text, **kwargs) -> list[float]
```

### Model Registry

```python
MODEL_REGISTRY = {
    # OpenAI
    "gpt-4o-mini": ModelInfo(provider=OPENAI, tier=FAST),
    "gpt-4o": ModelInfo(provider=OPENAI, tier=STRONG),
    
    # Anthropic
    "claude-sonnet-4-20250514": ModelInfo(provider=ANTHROPIC, tier=FAST),
    "claude-opus-4-20250514": ModelInfo(provider=ANTHROPIC, tier=STRONG),
    
    # Google Gemini
    "gemini-2.5-flash": ModelInfo(provider=GOOGLE, tier=FAST),
    "gemini-2.5-pro": ModelInfo(provider=GOOGLE, tier=STRONG),
    "gemini-3-flash-preview": ModelInfo(provider=GOOGLE, tier=STRONG),
    
    # Embeddings
    "text-embedding-3-small": ModelInfo(provider=OPENAI, supports_embeddings=True),
    "gemini-embedding-001": ModelInfo(provider=GOOGLE, supports_embeddings=True),
}
```

### Auto-Configuration

The backend auto-configures from environment variables on startup:
1. Check for `AZURE_API_KEY` + `AZURE_API_BASE` → Use Azure OpenAI
2. Check for `GOOGLE_API_KEY` → Use Google Gemini
3. Check for `OPENAI_API_KEY` → Use OpenAI

### Embedding Fallback

When using Azure OpenAI for chat (no embedding deployment):
1. Try Google embeddings if `GOOGLE_API_KEY` available
2. Fall back to Azure embedding model
3. Fall back to OpenAI if `OPENAI_API_KEY` available

---

## Authentication

### Web Application
- Google OAuth via Supabase Auth
- Cookie-based sessions
- Middleware checks session on protected routes

### Chrome Extension
- Google OAuth via `chrome.identity.launchWebAuthFlow`
- Exchanges Google ID token at `/api/auth/extension`
- Receives Supabase session, stores Bearer token locally
- All API requests include `Authorization: Bearer <token>`

### Local Development
- Email/password login enabled for testing
- Test user: `test@example.com` / `password123`

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Next.js API Routes** | Unified frontend + backend for auth/CRUD |
| **Python FastAPI for LLM** | Better async support, native SDK compatibility |
| **Provider-agnostic LLM** | Flexibility to switch providers, BYOK support |
| **Supabase** | Managed Postgres, built-in auth, pgvector support |
| **pgvector** | Vector similarity search without separate service |
| **Streamdown** | AI-optimized streaming markdown rendering |
| **URL-based chat routing** | Bookmarkable chats, browser history support |
| **Row-level security** | Data isolation enforced at database level |

---

## Project Structure

```
smart-notes-agent/
├── webapp/                      # Next.js application
│   └── src/
│       ├── app/
│       │   ├── api/             # Backend routes
│       │   │   ├── auth/        # OAuth callbacks
│       │   │   ├── folders/     # Folder CRUD
│       │   │   ├── sources/     # Source CRUD + resync
│       │   │   ├── highlights/  # Highlight CRUD
│       │   │   └── chats/       # Chat CRUD + RAG messages
│       │   ├── dashboard/       # Main app UI
│       │   └── login/           # Auth page
│       ├── components/
│       │   ├── layout/          # LeftPanel, ChatPanel
│       │   ├── chat/            # MarkdownRenderer, PastChatsDrawer
│       │   ├── loading-ui/      # OrbitRing, CometSpinner, TwinOrbit
│       │   └── ui/              # shadcn components
│       └── lib/
│           ├── ai.ts            # Calls Python backend
│           ├── types.ts         # TypeScript interfaces
│           └── supabase/        # Client configurations
│
├── app/                         # Python FastAPI backend
│   ├── llm/
│   │   ├── types.py             # Enums, ModelInfo, MODEL_REGISTRY
│   │   ├── client.py            # LLMClient dispatcher
│   │   └── providers/           # Provider implementations
│   │       ├── openai_provider.py
│   │       ├── anthropic_provider.py
│   │       ├── google_provider.py
│   │       ├── azure_provider.py
│   │       └── mistral_provider.py
│   ├── routers/
│   │   └── llm.py               # /llm/* endpoints
│   ├── db/
│   │   └── supabase.py          # Supabase client
│   └── main.py                  # FastAPI app
│
├── supabase/                    # Database config
│   ├── migrations/              # SQL migrations
│   ├── seed.sql                 # Test data
│   └── config.toml              # Local config
│
├── extension/                   # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── config.js                # API base URL, client IDs
│   ├── background/              # Service worker
│   ├── content/                 # Content script
│   └── popup/                   # Extension UI
│
└── documentation/               # This folder
```

---

## API Endpoints Summary

### Next.js API Routes

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/auth/callback` | GET | Web OAuth callback |
| `/api/auth/extension` | POST | Extension token exchange |
| `/api/folders` | GET, POST | List/create folders |
| `/api/folders/[id]` | GET, PUT, DELETE | Folder operations |
| `/api/sources` | GET, POST | List/create sources |
| `/api/sources/[id]` | GET, DELETE | Source operations |
| `/api/chats` | GET, POST | List/create chats |
| `/api/chats/[id]` | GET, PUT, DELETE | Chat operations |
| `/api/chats/[id]/messages` | POST | Send message, get RAG response |

### Python FastAPI Routes

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/llm/config` | GET, POST | Get/set LLM configuration |
| `/llm/models` | GET | List available models |
| `/llm/chat` | POST | Streaming chat completion |
| `/llm/embed` | POST | Generate embeddings |
| `/llm/summarize` | POST | Generate summary |
| `/db-test` | GET | Test database connection |

---

## RAG Implementation

1. **Embedding Model**: Configurable (default: `text-embedding-3-small` or `gemini-embedding-001`)
2. **Vector Storage**: Supabase with pgvector extension
3. **Similarity Search**: Cosine similarity via `match_embeddings` RPC
4. **Retrieval**: Top 8 matches above 0.3 threshold
5. **Context Building**: Format as `[Source: Title (URL)]\nContent`
6. **Chat Model**: Configurable (default: `gpt-4o-mini` or `gemini-2.5-flash`)
7. **System Prompt**: Instructs AI to cite sources and stay grounded

---

## Environment Variables

### Frontend (webapp/.env.development.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-key>
BACKEND_API_URL=http://127.0.0.1:8000
```

### Backend (app/.env)
```bash
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<local-service-key>

# LLM Providers (at least one required)
GOOGLE_API_KEY=<your-key>
OPENAI_API_KEY=<your-key>
AZURE_API_KEY=<your-key>
AZURE_API_BASE=<your-endpoint>
AZURE_API_DEPLOYMENT_NAME=<your-deployment>
AZURE_API_VERSION=2024-10-21
```

---

## Extension Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CHROME EXTENSION                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Popup (popup.html + popup.js)                              │
│   ├── Login UI (if not authenticated)                        │
│   ├── Save UI (folder dropdown, save button)                 │
│   └── Communicates via chrome.runtime.sendMessage            │
│                                                              │
│   Content Script (content.js)                                │
│   ├── Captures window.getSelection()                         │
│   ├── Extracts page metadata (title, URL, favicon)           │
│   └── Responds to popup queries                              │
│                                                              │
│   Service Worker (service-worker.js)                         │
│   ├── Handles Google OAuth flow                              │
│   ├── Stores auth tokens in chrome.storage.local             │
│   ├── Proxies all API requests with Bearer token             │
│   └── Message router for popup ↔ content script              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```
