-- Knowledge Hub: Initial Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Enable pgvector extension for embedding storage
create extension if not exists vector;

-- ============================================================
-- TABLES
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid not null references public.folders(id) on delete cascade,
  url text not null,
  title text,
  type text not null check (type in ('highlight', 'bookmark')) default 'bookmark',
  page_metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.ai_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  summary_text text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text default 'New Chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz default now()
);

create table public.embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  highlight_id uuid references public.highlights(id) on delete set null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_folders_user on folders(user_id);
create index idx_sources_user on sources(user_id);
create index idx_sources_folder on sources(folder_id);
create index idx_highlights_source on highlights(source_id);
create index idx_highlights_user on highlights(user_id);
create index idx_ai_summaries_source on ai_summaries(source_id);
create index idx_chats_user on chats(user_id);
create index idx_messages_chat on messages(chat_id);
create index idx_embeddings_user on embeddings(user_id);
create index idx_embeddings_source on embeddings(source_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.folders enable row level security;
alter table public.sources enable row level security;
alter table public.highlights enable row level security;
alter table public.ai_summaries enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.embeddings enable row level security;

-- Profiles: users can only access their own profile
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Folders: users can only access their own folders
create policy "Users can view own folders" on public.folders for select using (auth.uid() = user_id);
create policy "Users can create own folders" on public.folders for insert with check (auth.uid() = user_id);
create policy "Users can update own folders" on public.folders for update using (auth.uid() = user_id);
create policy "Users can delete own folders" on public.folders for delete using (auth.uid() = user_id);

-- Sources: users can only access their own sources
create policy "Users can view own sources" on public.sources for select using (auth.uid() = user_id);
create policy "Users can create own sources" on public.sources for insert with check (auth.uid() = user_id);
create policy "Users can update own sources" on public.sources for update using (auth.uid() = user_id);
create policy "Users can delete own sources" on public.sources for delete using (auth.uid() = user_id);

-- Highlights: users can only access their own highlights
create policy "Users can view own highlights" on public.highlights for select using (auth.uid() = user_id);
create policy "Users can create own highlights" on public.highlights for insert with check (auth.uid() = user_id);
create policy "Users can update own highlights" on public.highlights for update using (auth.uid() = user_id);
create policy "Users can delete own highlights" on public.highlights for delete using (auth.uid() = user_id);

-- AI Summaries
create policy "Users can view own summaries" on public.ai_summaries for select using (auth.uid() = user_id);
create policy "Users can create own summaries" on public.ai_summaries for insert with check (auth.uid() = user_id);
create policy "Users can update own summaries" on public.ai_summaries for update using (auth.uid() = user_id);
create policy "Users can delete own summaries" on public.ai_summaries for delete using (auth.uid() = user_id);

-- Chats
create policy "Users can view own chats" on public.chats for select using (auth.uid() = user_id);
create policy "Users can create own chats" on public.chats for insert with check (auth.uid() = user_id);
create policy "Users can update own chats" on public.chats for update using (auth.uid() = user_id);
create policy "Users can delete own chats" on public.chats for delete using (auth.uid() = user_id);

-- Messages: users can access messages in their own chats
create policy "Users can view own messages" on public.messages for select using (auth.uid() = user_id);
create policy "Users can create own messages" on public.messages for insert with check (auth.uid() = user_id);

-- Embeddings
create policy "Users can view own embeddings" on public.embeddings for select using (auth.uid() = user_id);
create policy "Users can create own embeddings" on public.embeddings for insert with check (auth.uid() = user_id);
create policy "Users can delete own embeddings" on public.embeddings for delete using (auth.uid() = user_id);

-- ============================================================
-- VECTOR SIMILARITY SEARCH FUNCTION
-- ============================================================

create or replace function match_embeddings(
  query_embedding vector(1536),
  match_user_id uuid,
  match_folder_ids uuid[] default null,
  match_source_ids uuid[] default null,
  match_count int default 5,
  match_threshold float default 0.5
)
returns table (
  id uuid,
  source_id uuid,
  highlight_id uuid,
  content text,
  similarity float
)
language plpgsql
security definer
as $$
begin
  return query
  select
    e.id,
    e.source_id,
    e.highlight_id,
    e.content,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.embeddings e
  left join public.sources s on e.source_id = s.id
  where e.user_id = match_user_id
    and (match_source_ids is null or e.source_id = any(match_source_ids))
    and (match_folder_ids is null or s.folder_id = any(match_folder_ids))
    and 1 - (e.embedding <=> query_embedding) > match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ============================================================
-- TRIGGER: auto-create profile on user signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', '')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TRIGGER: auto-update updated_at timestamps
-- ============================================================

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_folders_updated_at before update on public.folders for each row execute function public.update_updated_at();
create trigger update_sources_updated_at before update on public.sources for each row execute function public.update_updated_at();
create trigger update_highlights_updated_at before update on public.highlights for each row execute function public.update_updated_at();
create trigger update_ai_summaries_updated_at before update on public.ai_summaries for each row execute function public.update_updated_at();
create trigger update_chats_updated_at before update on public.chats for each row execute function public.update_updated_at();
create trigger update_profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at();
