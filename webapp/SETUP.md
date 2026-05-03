# Knowledge Hub — Setup Guide

## Prerequisites

- Node.js 18+ (recommended: 22)
- pnpm
- Python 3.11+ with uv
- Docker Desktop (for local Supabase)
- A Google Cloud project (for OAuth)

## 1. Local Supabase

```bash
# Start local Supabase (requires Docker running)
supabase start

# Apply migrations and seed data
supabase db reset
```

After `supabase start`, copy the output values:
- `API URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Google OAuth (for production)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → **APIs & Services → OAuth consent screen** → External
3. Add scopes: `openid`, `email`, `profile`
4. **Credentials → Create OAuth Client ID** → Web application
   - Redirect URI: your Supabase callback URL
   - Also add `http://localhost:3000/api/auth/callback` for local dev
5. Enable Google provider in Supabase Auth settings

For local dev, email/password login is available — no OAuth setup needed.

## 3. LLM Provider Keys

At least one provider is required. Set in `app/.env`:

```env
# Google (recommended for local dev)
GOOGLE_API_KEY=<your-google-ai-studio-key>

# Or OpenAI
OPENAI_API_KEY=<your-key>

# Or Azure OpenAI
AZURE_API_KEY=<your-key>
AZURE_API_BASE=<your-endpoint>
AZURE_API_DEPLOYMENT_NAME=<your-deployment>
AZURE_API_VERSION=2024-10-21
```

## 4. Environment Variables

### Frontend (`webapp/.env.development.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from-supabase-start>
SUPABASE_SERVICE_ROLE_KEY=<from-supabase-start>
BACKEND_API_URL=http://127.0.0.1:8000
```

### Backend (`app/.env`)

```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<from-supabase-start>
GOOGLE_API_KEY=<your-key>
```

## 5. Install & Run

### Web Application

```bash
cd webapp
pnpm install
pnpm dev              # → http://localhost:3000
```

### Python Backend

```bash
# From project root
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

### Chrome Extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `extension/` folder
4. Set `oauth2.client_id` in `extension/manifest.json` to your Chrome OAuth client ID

## 6. Test Login (Local Dev)

```
Email: test@example.com
Password: password123
```

Open http://localhost:3000 → log in → dashboard loads with folders + chat.

## Verify Everything Works

1. **Database**: `supabase status` should show all services running
2. **Backend**: `curl http://localhost:8000/db-test` should return success
3. **Frontend**: http://localhost:3000 should load the login page
4. **Chat**: Send a message → should see OrbitRing loader → streaming response
