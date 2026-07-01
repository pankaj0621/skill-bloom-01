
-- Path convention: chat-media/{from_user_id}/{message_uuid}/{filename}
CREATE POLICY "Users upload their own chat media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Sender can update or delete own chat media"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Both chat participants can read (sender always; recipient via peer_messages row)
CREATE POLICY "Chat participants can read chat media"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.peer_messages pm
        WHERE pm.media_path = storage.objects.name
          AND (pm.from_user_id = auth.uid() OR pm.to_user_id = auth.uid())
      )
    )
  );
