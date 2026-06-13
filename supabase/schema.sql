-- 1. PROFILES TABLE (linked to Auth users with learning stats)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  native_lang TEXT CHECK (native_lang IN ('en', 'es')) DEFAULT 'en',
  level TEXT CHECK (level IN ('basic', 'intermediate', 'advanced')) DEFAULT 'basic',
  words_translated INTEGER DEFAULT 0,
  chat_sessions INTEGER DEFAULT 0,
  pronunciation_attempts INTEGER DEFAULT 0,
  avg_pronunciation_score INTEGER DEFAULT 0,
  total_pronunciation_score INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Trigger to create profile when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    native_lang, 
    level, 
    words_translated, 
    chat_sessions, 
    pronunciation_attempts, 
    avg_pronunciation_score, 
    total_pronunciation_score
  )
  VALUES (new.id, 'en', 'basic', 0, 0, 0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();



-- 2. VOCABULARY TABLE (starred words)
CREATE TABLE public.vocabulary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  word TEXT NOT NULL,
  translation TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  part_of_speech TEXT,
  definition TEXT,
  example_sentence TEXT,
  example_translation TEXT,
  conjugations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own vocabulary"
  ON public.vocabulary FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_vocabulary_part_of_speech ON public.vocabulary(part_of_speech);
CREATE INDEX IF NOT EXISTS idx_vocabulary_user_id ON public.vocabulary(user_id);



-- 3. CHAT HISTORY TABLE (LLM Tutor Logs)
CREATE TABLE public.chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'model')) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and add their own chat logs"
  ON public.chat_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. NEWS ARTICLES TABLE (Community Shared News)
CREATE TABLE IF NOT EXISTS public.news_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  summary_basic TEXT NOT NULL,
  summary_intermediate TEXT NOT NULL,
  summary_advanced TEXT NOT NULL,
  vocab JSONB NOT NULL,
  submitted_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view news articles"
  ON public.news_articles FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can submit news articles"
  ON public.news_articles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE UNIQUE INDEX IF NOT EXISTS idx_news_articles_url ON public.news_articles(submitted_url);

