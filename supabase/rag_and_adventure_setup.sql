-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create Curriculum Chunks table for RAG
CREATE TABLE IF NOT EXISTS public.curriculum_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_name TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(768), -- Gemini text-embedding-004 uses 768 dimensions
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for curriculum_chunks
ALTER TABLE public.curriculum_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view curriculum chunks" 
  ON public.curriculum_chunks FOR SELECT 
  USING (true);

-- 3. Create Vector Search Function for RAG
CREATE OR REPLACE FUNCTION match_curriculum_chunks (
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  document_name TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    curriculum_chunks.id,
    curriculum_chunks.document_name,
    curriculum_chunks.content,
    1 - (curriculum_chunks.embedding <=> query_embedding) AS similarity
  FROM curriculum_chunks
  WHERE 1 - (curriculum_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY curriculum_chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 4. Create Literature Books table
CREATE TABLE IF NOT EXISTS public.literature_books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  source_lang TEXT CHECK (source_lang IN ('en', 'es')) NOT NULL,
  synopsis TEXT NOT NULL,
  synopsis_en TEXT,
  synopsis_es TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration for existing instances
ALTER TABLE public.literature_books ADD COLUMN IF NOT EXISTS synopsis_en TEXT;
ALTER TABLE public.literature_books ADD COLUMN IF NOT EXISTS synopsis_es TEXT;

-- Enable RLS for literature_books
ALTER TABLE public.literature_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view literature books" 
  ON public.literature_books FOR SELECT 
  USING (true);

-- 5. Create Literature Chapters table
CREATE TABLE IF NOT EXISTS public.literature_chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES public.literature_books(id) ON DELETE CASCADE NOT NULL,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  synopsis TEXT NOT NULL,
  summary_basic TEXT NOT NULL,
  summary_intermediate TEXT NOT NULL,
  summary_advanced TEXT NOT NULL,
  lines JSONB NOT NULL, -- Array of {target: string, native: string}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, chapter_number)
);

-- Enable RLS for literature_chapters
ALTER TABLE public.literature_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view literature chapters" 
  ON public.literature_chapters FOR SELECT 
  USING (true);

-- 6. Create User Literature Progress table for Adventure mode
CREATE TABLE IF NOT EXISTS public.user_literature_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.literature_books(id) ON DELETE CASCADE NOT NULL,
  completed_chapters INTEGER[] DEFAULT '{}',
  current_chapter INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Enable RLS for user_literature_progress
ALTER TABLE public.user_literature_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own literature progress" 
  ON public.user_literature_progress FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own literature progress" 
  ON public.user_literature_progress FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own literature progress" 
  ON public.user_literature_progress FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
