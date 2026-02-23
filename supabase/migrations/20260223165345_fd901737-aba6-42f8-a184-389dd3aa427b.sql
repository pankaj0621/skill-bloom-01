CREATE POLICY "Recipients can update own messages"
ON public.peer_messages
FOR UPDATE
USING (auth.uid() = to_user_id)
WITH CHECK (auth.uid() = to_user_id);