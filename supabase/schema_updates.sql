-- Table to track user's seen challenges (30-day no-repeat rule)
CREATE TABLE IF NOT EXISTS public.user_challenge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_title TEXT NOT NULL,
  shown_at DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id, challenge_title)
);

CREATE INDEX IF NOT EXISTS idx_user_challenge_history_user ON public.user_challenge_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_history_date ON public.user_challenge_history(shown_at);

-- RLS for user_challenge_history
ALTER TABLE public.user_challenge_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenge history" ON public.user_challenge_history 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenge history" ON public.user_challenge_history 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can manage challenge history" ON public.user_challenge_history 
  FOR ALL USING (true);

-- Add last_submission_date column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_submission_date DATE;

-- Atomic vote counter function to prevent race conditions
CREATE OR REPLACE FUNCTION public.atomic_vote(
  p_battle_id UUID,
  p_old_vote TEXT,
  p_new_vote TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Lock the battle row to prevent concurrent updates
  PERFORM 1 FROM public.ai_battles WHERE id = p_battle_id FOR UPDATE;

  IF p_old_vote IS NOT NULL THEN
    -- User is changing their vote
    IF p_old_vote = 'human' THEN
      UPDATE public.ai_battles
      SET human_votes = GREATEST(0, human_votes - 1)
      WHERE id = p_battle_id;
    ELSE
      UPDATE public.ai_battles
      SET ai_votes = GREATEST(0, ai_votes - 1)
      WHERE id = p_battle_id;
    END IF;
  END IF;

  IF p_new_vote IS NOT NULL THEN
    IF p_new_vote = 'human' THEN
      UPDATE public.ai_battles
      SET human_votes = human_votes + 1
      WHERE id = p_battle_id;
    ELSE
      UPDATE public.ai_battles
      SET ai_votes = ai_votes + 1
      WHERE id = p_battle_id;
    END IF;
  END IF;
END;
$$;

-- Add async evaluation status tracking
ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS evaluation_status TEXT DEFAULT 'completed' CHECK (evaluation_status IN ('pending', 'processing', 'completed', 'failed'));

ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS last_error TEXT;

-- ============================================
-- COMMENT LIKES
-- ============================================
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON public.comment_likes(user_id);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comment likes are publicly readable" ON public.comment_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like comments" ON public.comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments" ON public.comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- COMMENT REPLIES (parent_comment_id)
-- ============================================
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_comment_id);

-- ============================================
-- CHALLENGE BANK
-- ============================================
CREATE TABLE IF NOT EXISTS public.challenge_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT TRUE,
  source TEXT DEFAULT 'original' CHECK (source IN ('original', 'custom')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenge_bank_enabled ON public.challenge_bank(is_enabled);

-- RLS for challenge_bank
ALTER TABLE public.challenge_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Challenge bank is publicly readable" ON public.challenge_bank 
  FOR SELECT USING (true);

CREATE POLICY "Dev accounts can add challenges" ON public.challenge_bank 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_dev_account = true
    )
  );

CREATE POLICY "Dev accounts can update challenges" ON public.challenge_bank 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_dev_account = true
    )
  );

CREATE POLICY "Dev accounts can delete custom challenges" ON public.challenge_bank 
  FOR DELETE USING (
    source = 'custom' AND created_by = auth.uid()
  );

-- Service role can do anything (for seeding/reads)
CREATE POLICY "Service role can manage challenge bank" ON public.challenge_bank 
  FOR ALL USING (true);

-- ============================================
-- STORAGE POLICIES (Additional)
-- ============================================

-- Allow authenticated users to upload to submissions
DROP POLICY IF EXISTS "Anyone can upload to submissions" ON storage.objects;
CREATE POLICY "submissions_upload_authenticated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'submissions');

-- Allow anyone to read submissions
DROP POLICY IF EXISTS "Anyone can read submissions" ON storage.objects;
CREATE POLICY "submissions_read_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'submissions');

-- Allow users to delete their own submissions
DROP POLICY IF EXISTS "Users can delete own submissions" ON storage.objects;
CREATE POLICY "submissions_delete_own" ON storage.objects
  FOR DELETE USING (bucket_id = 'submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow anyone to upload to ai-generated
DROP POLICY IF EXISTS "Anyone can upload to ai-generated" ON storage.objects;
CREATE POLICY "ai_generated_upload_all" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ai-generated');

-- Allow anyone to read ai-generated
DROP POLICY IF EXISTS "Anyone can read ai-generated" ON storage.objects;
CREATE POLICY "ai_generated_read_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'ai-generated');

-- ============================================
-- CHALLENGE_BANK DEDUPLICATION & UNIQUE TITLE
-- ============================================

-- Remove any duplicate titles that may have been created by repeated seeds,
-- keeping the oldest row for each title.
DELETE FROM public.challenge_bank a
USING public.challenge_bank b
WHERE a.id <> b.id
  AND a.title = b.title
  AND (
    a.created_at > b.created_at
    OR (a.created_at = b.created_at AND a.id > b.id)
  );

-- Prevent future duplicate titles.
ALTER TABLE public.challenge_bank
  ADD CONSTRAINT challenge_bank_title_unique UNIQUE (title);
