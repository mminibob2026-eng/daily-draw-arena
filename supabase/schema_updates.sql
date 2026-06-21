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
