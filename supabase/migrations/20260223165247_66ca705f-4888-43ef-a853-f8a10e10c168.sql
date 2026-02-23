ALTER TABLE public.peer_messages ADD COLUMN read boolean NOT NULL DEFAULT false;
CREATE INDEX idx_peer_messages_unread ON public.peer_messages (to_user_id) WHERE read = false;