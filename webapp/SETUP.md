# Knowledge Hub - Setup Guide

## Prerequisites

- Node.js 18+ (recommended: 22)
- A Supabase project
- A Google Cloud project (for OAuth)
- An OpenAI API key (for chat + embeddings)

## 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration file: `supabase/migrations/001_initial_schema.sql`
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### Enable Google Auth in Supabase

1. Go to **Authentication → Providers → Google**
2. Toggle **Enable Sign in with Google**
3. Enter your Google OAuth **Client ID** and **Client Secret** (see step 2 below)
4. Copy the **Callback URL** shown by Supabase (e.g., `https://<project>.supabase.co/auth/v1/callback`)

## 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or select existing)
3. Go to **APIs & Services → OAuth consent screen**
   - Choose **External** user type
   - Fill in app name, support email, etc.
   - Add scopes: `openid`, `email`, `profile`
   - Add test users (during development)
   - **Publish** the consent screen when ready for production
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
   - **For the web app**: Choose "Web application"
     - Authorized redirect URIs: add the Supabase callback URL from step 1
     - Also add `http://localhost:3000/api/auth/callback` for local dev
   - **For the Chrome extension**: Choose "Chrome app"
     - Enter your extension ID (visible in `chrome://extensions` after loading unpacked)
5. Copy the **Client ID** and **Client Secret**

## 3. OpenAI Setup

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an API key
3. Set it as `OPENAI_API_KEY`

## 4. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in all values:

```bash
cp .env.local.example .env.local
```

## 5. Install & Run

```bash
cd webapp
npm install
npm run dev
```

Open http://localhost:3000

## 6. Chrome Extension (Load Unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** and select the `/extension` directory
4. Update `extension/manifest.json`:
   - Set `oauth2.client_id` to your Google OAuth Client ID for Chrome extensions
5. Click the extension icon to test

## Architecture

```
webapp/          → Next.js 15 (App Router) + Tailwind CSS
  src/app/       → Pages and API routes
  src/lib/       → Supabase clients, AI utilities, types
  src/components/→ React components (layout, folders, sources, chat)

extension/       → Chrome Extension (Manifest V3)
  popup/         → Extension popup (HTML/CSS/JS)
  content/       → Content script (reads page selection)
  background/    → Service worker (auth + API calls)
```
