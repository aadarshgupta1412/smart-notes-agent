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
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS API LAYER                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Auth Routes          Data Routes              AI Routes               │
│   ├── /auth/callback   ├── /folders/*           ├── /chats/[id]/messages│
│   └── /auth/extension  ├── /sources/*           └── /embeddings         │
│                        ├── /highlights/*                                │
│                        └── /chats/*                                     │
│                                                                         │
└───────────────────────────────┬────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Supabase                    OpenAI                   Google           │
│   ├── PostgreSQL + pgvector   ├── Embeddings API       └── OAuth        │
│   ├── Auth (sessions)         ├── Chat Completions                      │
│   └── Row-level security      └── (streaming)                           │
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
              Generate embedding for query
                           ↓
         Vector similarity search (match_embeddings RPC)
         Filtered by: user_id, folder_ids, source_ids
                           ↓
         Fetch source metadata for top matches
                           ↓
         Build context: "[Source: Title]\nContent..."
                           ↓
         Send to LLM: system prompt + context + chat history
                           ↓
         Stream response back to client
```

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

### Dual Auth Support
API routes check both:
1. Cookie session (web)
2. Bearer token header (extension)

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Next.js API Routes** | Unified frontend + backend, easy deployment |
| **Supabase** | Managed Postgres, built-in auth, pgvector support |
| **pgvector** | Vector similarity search without separate service |
| **Fire-and-forget AI** | Don't block save operation on embedding/summary generation |
| **Vercel AI SDK** | Simplified streaming responses |
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
│       │   │   ├── chats/       # Chat CRUD + RAG messages
│       │   │   └── embeddings/  # Embedding generation
│       │   ├── dashboard/       # Main app UI
│       │   └── login/           # Auth page
│       ├── components/          # React components
│       │   ├── layout/          # LeftPanel, ChatPanel
│       │   ├── folders/         # FolderList
│       │   ├── sources/         # SourceList, SourceDetail
│       │   ├── chat/            # PastChatsDrawer, MentionDropdown
│       │   └── ui/              # shadcn components
│       └── lib/
│           ├── ai.ts            # OpenAI client, embeddings, summaries
│           ├── types.ts         # TypeScript interfaces
│           └── supabase/        # Client configurations
│
├── extension/                   # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── config.js                # API base URL, client IDs
│   ├── background/              # Service worker (auth, API proxy)
│   ├── content/                 # Content script (selection capture)
│   └── popup/                   # Extension UI
│
└── documentation/               # This folder
```

---

## API Endpoints Summary

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/auth/callback` | GET | Web OAuth callback |
| `/api/auth/extension` | POST | Extension token exchange |
| `/api/folders` | GET, POST | List/create folders |
| `/api/folders/[id]` | GET, PUT, DELETE | Folder operations |
| `/api/sources` | GET, POST | List/create sources |
| `/api/sources/[id]` | GET, DELETE | Source operations |
| `/api/sources/[id]/resync` | POST | Regenerate AI content |
| `/api/highlights` | GET, POST | List/create highlights |
| `/api/chats` | GET, POST | List/create chats |
| `/api/chats/[id]` | GET, PUT, DELETE | Chat operations |
| `/api/chats/[id]/messages` | POST | Send message, get RAG response |
| `/api/embeddings` | POST | Generate embedding |

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

---

## RAG Implementation

1. **Embedding Model**: OpenAI `text-embedding-3-small` (1536 dimensions)
2. **Vector Storage**: Supabase with pgvector extension
3. **Similarity Search**: Cosine similarity via `match_embeddings` RPC
4. **Retrieval**: Top 8 matches above 0.3 threshold
5. **Context Building**: Format as `[Source: Title (URL)]\nContent`
6. **Chat Model**: OpenAI `gpt-4o-mini` with streaming
7. **System Prompt**: Instructs AI to cite sources and stay grounded

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Extension uses `config.js` for `API_BASE` and `GOOGLE_CLIENT_ID`.
