
-- Create blocked_users table
CREATE TABLE public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own blocks
CREATE POLICY "Users can view own blocks"
ON public.blocked_users FOR SELECT
USING (auth.uid() = blocker_id);

-- Users can block others
CREATE POLICY "Users can block others"
ON public.blocked_users FOR INSERT
WITH CHECK (auth.uid() = blocker_id AND blocker_id <> blocked_id);

-- Users can unblock
CREATE POLICY "Users can unblock"
ON public.blocked_users FOR DELETE
USING (auth.uid() = blocker_id);

-- Update peer_messages INSERT policy to also check blocks
DROP POLICY IF EXISTS "Friends can send messages" ON public.peer_messages;
CREATE POLICY "Friends can send messages"
ON public.peer_messages FOR INSERT
WITH CHECK (
  auth.uid() = from_user_id
  AND EXISTS (
    SELECT 1 FROM friendships
    WHERE friendships.status = 'accepted'
    AND (
      (friendships.requester_id = auth.uid() AND friendships.addressee_id = peer_messages.to_user_id)
      OR (friendships.addressee_id = auth.uid() AND friendships.requester_id = peer_messages.to_user_id)
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocked_users.blocker_id = peer_messages.to_user_id AND blocked_users.blocked_id = auth.uid())
    OR (blocked_users.blocker_id = auth.uid() AND blocked_users.blocked_id = peer_messages.to_user_id)
  )
);

-- Enable realtime for blocked_users
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_users;
