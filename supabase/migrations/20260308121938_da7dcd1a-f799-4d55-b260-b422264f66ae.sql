
-- Feedback table
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'feature_request',
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  admin_response text,
  votes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Feedback votes table (one vote per user per feedback)
CREATE TABLE public.feedback_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(feedback_id, user_id)
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY;

-- Feedback policies
CREATE POLICY "Authenticated users can view feedback" ON public.feedback
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create feedback" ON public.feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback" ON public.feedback
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own feedback" ON public.feedback
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all feedback" ON public.feedback
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all feedback" ON public.feedback
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Vote policies
CREATE POLICY "Authenticated users can view votes" ON public.feedback_votes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can vote" ON public.feedback_votes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own vote" ON public.feedback_votes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger to update votes_count
CREATE OR REPLACE FUNCTION public.update_feedback_votes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feedback SET votes_count = votes_count + 1 WHERE id = NEW.feedback_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feedback SET votes_count = votes_count - 1 WHERE id = OLD.feedback_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_feedback_vote_change
  AFTER INSERT OR DELETE ON public.feedback_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_feedback_votes_count();

-- Updated_at trigger
CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
