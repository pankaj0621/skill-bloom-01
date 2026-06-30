
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- first_skill
  IF NOT ('first_skill' = ANY(earned_keys)) THEN
    SELECT EXISTS(
      SELECT 1 FROM public.user_skill_progress
      WHERE user_id = uid AND status <> 'not_started'
    ) INTO has_first_skill;
    IF has_first_skill THEN to_award := to_award || 'first_skill'; END IF;
  END IF;

  -- streak badges
  SELECT COALESCE(current_streak, 0) INTO user_streak FROM public.profiles WHERE id = uid;
  IF user_streak >= 7 AND NOT ('streak_7' = ANY(earned_keys)) THEN
    to_award := to_award || 'streak_7';
  END IF;
  IF user_streak >= 30 AND NOT ('streak_30' = ANY(earned_keys)) THEN
    to_award := to_award || 'streak_30';
  END IF;

  -- first_track_complete
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
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_award_badges() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_and_award_badges() TO authenticated;
