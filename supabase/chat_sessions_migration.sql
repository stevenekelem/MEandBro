-- ==============================================================================
-- SPANGLISH: MULTI-SESSION CONVERSATIONS & CHAT HISTORY MIGRATION
-- Supports ChatGPT / Gemini style conversation management and lesson threads
-- ==============================================================================

-- 1. CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  type TEXT CHECK (type IN ('lesson', 'custom', 'roleplay', 'grammar_review')) DEFAULT 'custom',
  concept_id TEXT, -- e.g. 'es-basic-ser-estar' for structured study lessons
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and manage their own conversations"
  ON public.conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user_updated 
  ON public.conversations(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_concept 
  ON public.conversations(user_id, concept_id);


-- 2. CHAT MESSAGES TABLE (Thread-Scoped)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'model', 'system')) NOT NULL,
  content TEXT NOT NULL,
  feedback JSONB, -- For AI grammar feedback, pronunciation tips, or metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and manage their own messages"
  ON public.chat_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_created 
  ON public.chat_messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user 
  ON public.chat_messages(user_id);


-- 3. OPTIONAL BACKWARD-COMPATIBILITY MIGRATION
-- Migrate existing flat chat_history into a default conversation per user
DO $$
DECLARE
  rec RECORD;
  new_conv_id UUID;
BEGIN
  -- Check if legacy public.chat_history exists and has rows
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_history') THEN
    FOR rec IN SELECT DISTINCT user_id FROM public.chat_history LOOP
      -- Create default conversation for user if they don't already have one
      IF NOT EXISTS (SELECT 1 FROM public.conversations WHERE user_id = rec.user_id) THEN
        INSERT INTO public.conversations (user_id, title, type, created_at, updated_at)
        VALUES (rec.user_id, 'Previous Tutor Chat', 'custom', NOW(), NOW())
        RETURNING id INTO new_conv_id;

        -- Migrate messages
        INSERT INTO public.chat_messages (conversation_id, user_id, role, content, created_at)
        SELECT new_conv_id, user_id, role, content, created_at
        FROM public.chat_history
        WHERE user_id = rec.user_id
        ORDER BY created_at ASC;
      END IF;
    END LOOP;
  END IF;
END $$;
