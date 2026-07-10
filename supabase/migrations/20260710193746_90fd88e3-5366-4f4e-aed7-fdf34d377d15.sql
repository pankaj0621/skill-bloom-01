
-- 1. Revoke default PUBLIC EXECUTE from all SECURITY DEFINER functions in public
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', r.proname, r.args);
  END LOOP;
END $$;

-- 2. Re-grant EXECUTE to authenticated only for legitimate RPCs called from the app
GRANT EXECUTE ON FUNCTION public.mark_peer_messages_read(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_peer_messages_seen(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_peer_messages() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 3. Convert check_and_award_badges to SECURITY INVOKER (still callable, uses auth.uid())
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  earned_keys text[];
  to_award text[] := ARRAY[]::text[];
  has_first_skill boolean;
  user_streak integer;
  has_completed_track boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(array_agg(badge_key), ARRAY[]::text[]) INTO earned_keys
  FROM public.user_badges WHERE user_id = uid;

  IF NOT ('first_skill' = ANY(earned_keys)) THEN
    SELECT EXISTS(
      SELECT 1 FROM public.user_skill_progress
      WHERE user_id = uid AND status <> 'not_started'
    ) INTO has_first_skill;
    IF has_first_skill THEN to_award := to_award || 'first_skill'; END IF;
  END IF;

  SELECT COALESCE(current_streak, 0) INTO user_streak FROM public.profiles WHERE id = uid;
  IF user_streak >= 7 AND NOT ('streak_7' = ANY(earned_keys)) THEN
    to_award := to_award || 'streak_7';
  END IF;
  IF user_streak >= 30 AND NOT ('streak_30' = ANY(earned_keys)) THEN
    to_award := to_award || 'streak_30';
  END IF;

  IF NOT ('first_track_complete' = ANY(earned_keys)) THEN
    SELECT EXISTS(
      SELECT 1
      FROM (
        SELECT s.track_id,
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE usp.status = 'completed') AS completed
        FROM public.user_skill_progress usp
        JOIN public.skills s ON s.id = usp.skill_id
        WHERE usp.user_id = uid AND s.track_id IS NOT NULL
        GROUP BY s.track_id
      ) t
      WHERE t.total > 0 AND t.total = t.completed
    ) INTO has_completed_track;
    IF has_completed_track THEN to_award := to_award || 'first_track_complete'; END IF;
  END IF;

  IF array_length(to_award, 1) > 0 THEN
    INSERT INTO public.user_badges (user_id, badge_key)
    SELECT uid, unnest(to_award)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN to_award;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.check_and_award_badges() TO authenticated;

-- 4. Drop the storage.objects SELECT policy that permits listing the avatars bucket.
-- Public avatar images remain readable via their public URL because the bucket
-- itself is public; removing this policy just blocks folder listing/enumeration.
DROP POLICY IF EXISTS "Users can list own avatar folder" ON storage.objects;
