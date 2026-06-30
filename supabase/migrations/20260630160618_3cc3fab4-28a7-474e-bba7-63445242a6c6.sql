
CREATE TABLE public.peer_guidance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES public.skills(id) ON DELETE SET NULL,
  skill_name TEXT NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','answered','closed')),
  helper_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.peer_guidance_requests TO authenticated;
GRANT ALL ON public.peer_guidance_requests TO service_role;

ALTER TABLE public.peer_guidance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view guidance requests"
  ON public.peer_guidance_requests FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can create their own guidance requests"
  ON public.peer_guidance_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner or helper can update guidance requests"
  ON public.peer_guidance_requests FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR auth.uid() = helper_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = helper_id);

CREATE POLICY "Owner can delete their guidance requests"
  ON public.peer_guidance_requests FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_peer_guidance_requests_updated_at
  BEFORE UPDATE ON public.peer_guidance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_peer_guidance_requests_status ON public.peer_guidance_requests(status, created_at DESC);
CREATE INDEX idx_peer_guidance_requests_user ON public.peer_guidance_requests(user_id);
