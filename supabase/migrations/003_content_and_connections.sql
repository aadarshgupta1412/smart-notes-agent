-- ============================================================
-- Migration 003: Content Chunks & Smart Connections
-- ============================================================

-- 1. Source content chunks table
-- Stores extracted full-text content from URLs, split into chunks for embedding
CREATE TABLE public.source_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  content text NOT NULL,
  token_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(source_id, chunk_index)
);

CREATE INDEX idx_source_chunks_source ON public.source_chunks(source_id);
CREATE INDEX idx_source_chunks_user ON public.source_chunks(user_id);

ALTER TABLE public.source_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own chunks" ON public.source_chunks FOR ALL USING (auth.uid() = user_id);

-- 2. Smart connections table
-- Pre-computed similarity connections between sources
CREATE TABLE public.source_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  connected_source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  similarity float NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(source_id, connected_source_id)
);

CREATE INDEX idx_connections_source ON public.source_connections(source_id);
CREATE INDEX idx_connections_connected ON public.source_connections(connected_source_id);
CREATE INDEX idx_connections_user ON public.source_connections(user_id);

ALTER TABLE public.source_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own connections" ON public.source_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert connections" ON public.source_connections FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own connections" ON public.source_connections FOR DELETE USING (auth.uid() = user_id);

-- 3. Add extracted_content columns to sources
-- Full extracted text content from URL (before chunking)
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS extracted_content text;
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS content_extracted_at timestamptz;
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS word_count int DEFAULT 0;

-- 4. Function to find connections for a source
CREATE OR REPLACE FUNCTION get_source_connections(
  p_source_id uuid,
  p_user_id uuid,
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  connected_source_id uuid,
  title text,
  url text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.connected_source_id,
    s.title,
    s.url,
    sc.similarity
  FROM public.source_connections sc
  JOIN public.sources s ON s.id = sc.connected_source_id
  WHERE sc.source_id = p_source_id
    AND sc.user_id = p_user_id
  ORDER BY sc.similarity DESC
  LIMIT p_limit;
END;
$$;

-- 5. Functions to find similar sources by embedding comparison
CREATE OR REPLACE FUNCTION find_similar_sources(
  p_embedding vector(1536),
  p_user_id uuid,
  p_exclude_source_id uuid,
  p_limit int DEFAULT 5,
  p_threshold float DEFAULT 0.6
)
RETURNS TABLE (
  source_id uuid,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.source_id,
    (1 - (e.embedding <=> p_embedding))::float AS similarity
  FROM public.embeddings e
  WHERE e.user_id = p_user_id
    AND e.source_id != p_exclude_source_id
    AND e.embedding IS NOT NULL
    AND (1 - (e.embedding <=> p_embedding)) > p_threshold
  GROUP BY e.source_id, e.embedding
  ORDER BY e.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION find_similar_sources_768(
  p_embedding vector(768),
  p_user_id uuid,
  p_exclude_source_id uuid,
  p_limit int DEFAULT 5,
  p_threshold float DEFAULT 0.6
)
RETURNS TABLE (
  source_id uuid,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.source_id,
    (1 - (e.embedding_768 <=> p_embedding))::float AS similarity
  FROM public.embeddings e
  WHERE e.user_id = p_user_id
    AND e.source_id != p_exclude_source_id
    AND e.embedding_768 IS NOT NULL
    AND (1 - (e.embedding_768 <=> p_embedding)) > p_threshold
  GROUP BY e.source_id, e.embedding_768
  ORDER BY e.embedding_768 <=> p_embedding
  LIMIT p_limit;
END;
$$;
