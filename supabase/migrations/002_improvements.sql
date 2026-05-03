-- Migration: 002_improvements.sql
-- Adds: HNSW indexes, flexible embedding dimensions, user LLM settings,
--        usage tracking, full-text search, tags system, chat FTS indexes

-- ============================================================================
-- 1. HNSW vector index for fast similarity search
-- ============================================================================

CREATE INDEX idx_embeddings_vector_hnsw ON public.embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- 2. Flexible embedding dimensions (support 1536 + 768)
-- ============================================================================

ALTER TABLE public.embeddings ADD COLUMN IF NOT EXISTS dimensions int DEFAULT 1536;

-- pgvector doesn't support variable-length vectors in a single indexed column.
-- Strategy: Add a second column for 768-dim embeddings used by Google models.
ALTER TABLE public.embeddings ADD COLUMN IF NOT EXISTS embedding_768 vector(768);

CREATE INDEX idx_embeddings_vector_768_hnsw ON public.embeddings 
USING hnsw (embedding_768 vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Updated match function that supports both 1536 and 768 dim embeddings
CREATE OR REPLACE FUNCTION match_embeddings_v2(
  query_embedding_1536 vector(1536) DEFAULT NULL,
  query_embedding_768 vector(768) DEFAULT NULL,
  match_user_id uuid,
  match_folder_ids uuid[] DEFAULT NULL,
  match_source_ids uuid[] DEFAULT NULL,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  source_id uuid,
  highlight_id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF query_embedding_1536 IS NOT NULL THEN
    RETURN QUERY
    SELECT
      e.id, e.source_id, e.highlight_id, e.content,
      (1 - (e.embedding <=> query_embedding_1536))::float AS similarity
    FROM public.embeddings e
    LEFT JOIN public.sources s ON e.source_id = s.id
    WHERE e.user_id = match_user_id
      AND e.embedding IS NOT NULL
      AND (match_source_ids IS NULL OR e.source_id = ANY(match_source_ids))
      AND (match_folder_ids IS NULL OR s.folder_id = ANY(match_folder_ids))
      AND (1 - (e.embedding <=> query_embedding_1536)) > match_threshold
    ORDER BY e.embedding <=> query_embedding_1536
    LIMIT match_count;
  ELSIF query_embedding_768 IS NOT NULL THEN
    RETURN QUERY
    SELECT
      e.id, e.source_id, e.highlight_id, e.content,
      (1 - (e.embedding_768 <=> query_embedding_768))::float AS similarity
    FROM public.embeddings e
    LEFT JOIN public.sources s ON e.source_id = s.id
    WHERE e.user_id = match_user_id
      AND e.embedding_768 IS NOT NULL
      AND (match_source_ids IS NULL OR e.source_id = ANY(match_source_ids))
      AND (match_folder_ids IS NULL OR s.folder_id = ANY(match_folder_ids))
      AND (1 - (e.embedding_768 <=> query_embedding_768)) > match_threshold
    ORDER BY e.embedding_768 <=> query_embedding_768
    LIMIT match_count;
  END IF;
END;
$$;

-- ============================================================================
-- 3. user_llm_settings table (per-user BYOK)
-- ============================================================================

CREATE TABLE public.user_llm_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google', 'azure_openai', 'mistral')),
  api_key_encrypted text NOT NULL,
  fast_model text NOT NULL,
  strong_model text NOT NULL,
  embedding_model text NOT NULL DEFAULT 'text-embedding-3-small',
  azure_endpoint text,
  azure_api_version text DEFAULT '2024-10-21',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_llm_settings_user ON public.user_llm_settings(user_id);

ALTER TABLE public.user_llm_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own LLM settings" ON public.user_llm_settings FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_user_llm_settings_updated_at 
  BEFORE UPDATE ON public.user_llm_settings 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 4. Usage tracking table
-- ============================================================================

CREATE TABLE public.usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation text NOT NULL CHECK (operation IN ('chat', 'embed', 'summarize')),
  provider text NOT NULL,
  model text NOT NULL,
  prompt_tokens int DEFAULT 0,
  completion_tokens int DEFAULT 0,
  total_tokens int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_usage_logs_user ON public.usage_logs(user_id);
CREATE INDEX idx_usage_logs_user_date ON public.usage_logs(user_id, created_at DESC);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own usage" ON public.usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert usage" ON public.usage_logs FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 5. Full-text search
-- ============================================================================

ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS fts tsvector 
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(url, ''))) STORED;
CREATE INDEX idx_sources_fts ON public.sources USING gin(fts);

ALTER TABLE public.highlights ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;
CREATE INDEX idx_highlights_fts ON public.highlights USING gin(fts);

CREATE OR REPLACE FUNCTION search_content(
  search_query text,
  search_user_id uuid,
  search_folder_ids uuid[] DEFAULT NULL,
  result_limit int DEFAULT 20
)
RETURNS TABLE (
  item_type text,
  item_id uuid,
  source_id uuid,
  title text,
  content_snippet text,
  rank float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tsquery_val tsquery;
BEGIN
  tsquery_val := plainto_tsquery('english', search_query);
  
  RETURN QUERY
  (
    SELECT 
      'source'::text AS item_type,
      s.id AS item_id,
      s.id AS source_id,
      s.title,
      left(s.url, 200) AS content_snippet,
      ts_rank(s.fts, tsquery_val)::float AS rank
    FROM public.sources s
    WHERE s.user_id = search_user_id
      AND s.fts @@ tsquery_val
      AND (search_folder_ids IS NULL OR s.folder_id = ANY(search_folder_ids))
  )
  UNION ALL
  (
    SELECT
      'highlight'::text AS item_type,
      h.id AS item_id,
      h.source_id,
      NULL AS title,
      left(h.content, 200) AS content_snippet,
      ts_rank(h.fts, tsquery_val)::float AS rank
    FROM public.highlights h
    JOIN public.sources s ON h.source_id = s.id
    WHERE h.user_id = search_user_id
      AND h.fts @@ tsquery_val
      AND (search_folder_ids IS NULL OR s.folder_id = ANY(search_folder_ids))
  )
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$;

-- ============================================================================
-- 6. Tags system
-- ============================================================================

CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE TABLE public.source_tags (
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (source_id, tag_id)
);

CREATE INDEX idx_tags_user ON public.tags(user_id);
CREATE INDEX idx_source_tags_source ON public.source_tags(source_id);
CREATE INDEX idx_source_tags_tag ON public.source_tags(tag_id);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tags" ON public.tags FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own source_tags" ON public.source_tags FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.sources s WHERE s.id = source_id AND s.user_id = auth.uid()));

-- ============================================================================
-- 7. Chat full-text search indexes
-- ============================================================================

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;
CREATE INDEX idx_messages_fts ON public.messages USING gin(fts);

ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, ''))) STORED;
CREATE INDEX idx_chats_fts ON public.chats USING gin(fts);
