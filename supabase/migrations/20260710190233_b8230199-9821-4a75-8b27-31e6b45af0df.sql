-- Lock down SECURITY DEFINER helper/trigger functions so anon & authenticated
-- cannot execute them directly. Triggers still fire (they don't check EXECUTE).
DO $$
DECLARE
  fn text;
  keep_fns text[] := ARRAY[
    'has_role(uuid,app_role)',
    'is_own_record(uuid)',
    'check_and_award_badges()',
    'cleanup_expired_peer_messages()',
    'mark_peer_messages_read(uuid,uuid)',
    'mark_peer_messages_seen(uuid[])'
  ];
BEGIN
  FOR fn IN
    SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    IF NOT (fn = ANY(keep_fns)) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    END IF;
  END LOOP;
END $$;

-- Storage: tighten avatar SELECT so only signed-in users can list, and only
-- their own folder. Public read access still works via the bucket's public URL.
DROP POLICY IF EXISTS "Users can list own avatar folder" ON storage.objects;
CREATE POLICY "Users can list own avatar folder"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Also scope the avatar write policies to authenticated (were public).
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );