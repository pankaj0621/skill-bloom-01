
-- Helper functions
CREATE OR REPLACE FUNCTION public.is_own_record(record_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() = record_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Profiles table (id = auth.users.id)
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('junior', 'senior')),
  bio TEXT,
  year INT,
  college TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Skill tracks table
CREATE TABLE public.skill_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.skill_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view skill tracks"
  ON public.skill_tracks FOR SELECT
  USING (true);

-- Skills table
CREATE TABLE public.skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES public.skill_tracks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  "order" INT NOT NULL DEFAULT 0,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view skills"
  ON public.skills FOR SELECT
  USING (true);

-- User skill progress
CREATE TABLE public.user_skill_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

ALTER TABLE public.user_skill_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON public.user_skill_progress FOR SELECT
  USING (public.is_own_record(user_id));

CREATE POLICY "Users can insert own progress"
  ON public.user_skill_progress FOR INSERT
  WITH CHECK (public.is_own_record(user_id));

CREATE POLICY "Users can update own progress"
  ON public.user_skill_progress FOR UPDATE
  USING (public.is_own_record(user_id));

CREATE POLICY "Users can delete own progress"
  ON public.user_skill_progress FOR DELETE
  USING (public.is_own_record(user_id));

-- User custom skills
CREATE TABLE public.user_custom_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.skill_tracks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_custom_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom skills"
  ON public.user_custom_skills FOR SELECT
  USING (public.is_own_record(user_id));

CREATE POLICY "Users can insert own custom skills"
  ON public.user_custom_skills FOR INSERT
  WITH CHECK (public.is_own_record(user_id));

CREATE POLICY "Users can update own custom skills"
  ON public.user_custom_skills FOR UPDATE
  USING (public.is_own_record(user_id));

CREATE POLICY "Users can delete own custom skills"
  ON public.user_custom_skills FOR DELETE
  USING (public.is_own_record(user_id));

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_skills_track_id ON public.skills(track_id);
CREATE INDEX idx_user_skill_progress_user_id ON public.user_skill_progress(user_id);
CREATE INDEX idx_user_skill_progress_skill_id ON public.user_skill_progress(skill_id);
CREATE INDEX idx_user_custom_skills_user_id ON public.user_custom_skills(user_id);
CREATE INDEX idx_user_custom_skills_track_id ON public.user_custom_skills(track_id);
