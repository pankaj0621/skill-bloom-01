
-- Add computed level to profiles for peer discovery
ALTER TABLE public.profiles
ADD COLUMN computed_level TEXT NOT NULL DEFAULT 'Beginner';

-- Peer messages table
CREATE TABLE public.peer_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.peer_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages they sent or received
CREATE POLICY "Users can view own messages"
  ON public.peer_messages FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send messages"
  ON public.peer_messages FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE INDEX idx_peer_messages_from ON public.peer_messages(from_user_id);
CREATE INDEX idx_peer_messages_to ON public.peer_messages(to_user_id);
CREATE INDEX idx_peer_messages_conversation ON public.peer_messages(from_user_id, to_user_id, created_at);
