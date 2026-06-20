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
