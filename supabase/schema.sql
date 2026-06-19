-- Daily Draw Arena Database Schema
-- Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  streak_count INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  submissions_count INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  is_dev_account BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTIONS (Stripe - deferred)
-- ============================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan TEXT CHECK (plan IN ('free', 'premium')) DEFAULT 'free',
  status TEXT CHECK (status IN ('active', 'canceled', 'past_due')) DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DAILY CHALLENGES
-- ============================================
CREATE TABLE public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  challenge_date DATE NOT NULL,
  slot INTEGER CHECK (slot IN (1, 2, 3)) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_date, slot)
);

-- ============================================
-- SUBMISSIONS
-- ============================================
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_storage_path TEXT,
  is_ai_battle BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- ============================================
-- AI EVALUATIONS
-- ============================================
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID UNIQUE REFERENCES public.submissions(id) ON DELETE CASCADE,
  creativity DECIMAL(5,1) CHECK (creativity BETWEEN 1 AND 100),
  storytelling DECIMAL(5,1) CHECK (storytelling BETWEEN 1 AND 100),
  composition DECIMAL(5,1) CHECK (composition BETWEEN 1 AND 100),
  effort DECIMAL(5,1) CHECK (effort BETWEEN 1 AND 100),
  originality DECIMAL(5,1) CHECK (originality BETWEEN 1 AND 100),
  final_score DECIMAL(5,1) CHECK (final_score BETWEEN 1 AND 100),
  strengths TEXT,
  weaknesses TEXT,
  improvements TEXT,
  evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEADERBOARD
-- ============================================
CREATE TABLE public.leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rank INTEGER,
  final_score DECIMAL(5,1),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

-- ============================================
-- AI GENERATED IMAGES (for AI Battle)
-- ============================================
CREATE TABLE public.ai_generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_storage_path TEXT,
  variant INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI BATTLES
-- ============================================
CREATE TABLE public.ai_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  human_submission_id UUID REFERENCES public.submissions(id),
  ai_image_id UUID REFERENCES public.ai_generated_images(id),
  human_votes INTEGER DEFAULT 0,
  ai_votes INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('voting', 'completed')) DEFAULT 'voting',
  winner TEXT CHECK (winner IN ('human', 'ai', 'tie')),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI BATTLE VIEWS (unique AI image per user)
-- ============================================
CREATE TABLE public.ai_battle_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID REFERENCES public.ai_battles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ai_image_id UUID REFERENCES public.ai_generated_images(id),
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(battle_id, user_id)
);

-- ============================================
-- VOTES
-- ============================================
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID REFERENCES public.ai_battles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote_for TEXT CHECK (vote_for IN ('human', 'ai')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(battle_id, user_id)
);

-- ============================================
-- COMMENTS
-- ============================================
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LIKES
-- ============================================
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, user_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_submissions_challenge ON public.submissions(challenge_id);
CREATE INDEX idx_submissions_user ON public.submissions(user_id);
CREATE INDEX idx_daily_challenges_date ON public.daily_challenges(challenge_date);
CREATE INDEX idx_leaderboard_challenge ON public.leaderboard(challenge_id);
CREATE INDEX idx_comments_submission ON public.comments(submission_id);
CREATE INDEX idx_likes_submission ON public.likes(submission_id);
CREATE INDEX idx_ai_battles_challenge ON public.ai_battles(challenge_id);
CREATE INDEX idx_votes_battle ON public.votes(battle_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_battle_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Profiles: public read, self write
CREATE POLICY "Profiles are publicly readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Daily challenges: public read
CREATE POLICY "Challenges are publicly readable" ON public.daily_challenges FOR SELECT USING (true);
CREATE POLICY "Only service role can insert challenges" ON public.daily_challenges FOR INSERT WITH CHECK (false);

-- Submissions: public read, authenticated write (one per challenge)
CREATE POLICY "Submissions are publicly readable" ON public.submissions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create submissions" ON public.submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own submissions" ON public.submissions FOR DELETE USING (auth.uid() = user_id);

-- Evaluations: public read
CREATE POLICY "Evaluations are publicly readable" ON public.evaluations FOR SELECT USING (true);

-- Leaderboard: public read
CREATE POLICY "Leaderboard is publicly readable" ON public.leaderboard FOR SELECT USING (true);

-- AI battles: public read
CREATE POLICY "Battles are publicly readable" ON public.ai_battles FOR SELECT USING (true);

-- Votes: authenticated users can vote
CREATE POLICY "Authenticated users can vote" ON public.votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vote" ON public.votes FOR UPDATE USING (auth.uid() = user_id);

-- Comments: public read, authenticated write
CREATE POLICY "Comments are publicly readable" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Likes: authenticated users can like/unlike
CREATE POLICY "Likes are publicly readable" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('submissions', 'submissions', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('ai-generated', 'ai-generated', true);

CREATE POLICY "Anyone can upload to submissions" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'submissions');
CREATE POLICY "Anyone can read submissions" ON storage.objects FOR SELECT USING (bucket_id = 'submissions');
CREATE POLICY "Users can delete own submissions" ON storage.objects FOR DELETE USING (bucket_id = 'submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can upload to ai-generated" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ai-generated');
CREATE POLICY "Anyone can read ai-generated" ON storage.objects FOR SELECT USING (bucket_id = 'ai-generated');
