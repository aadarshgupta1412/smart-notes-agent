# Knowledge Hub

> Your AI-powered second brain for web content

## Quick Links

- **[Product Context](./PRODUCT.md)** - Vision, features, user journeys, roadmap
- **[Architecture](./ARCHITECTURE.md)** - System design, data flows, project structure

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

### Web Application
```bash
cd webapp
pnpm install
pnpm dev
```

### Chrome Extension
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` folder

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: OpenAI (embeddings, chat, summaries)
- **Auth**: Google OAuth via Supabase
- **Extension**: Chrome Manifest V3
