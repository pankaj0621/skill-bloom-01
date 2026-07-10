
-- Robust conflict handling for account linking / legacy merge

CREATE OR REPLACE FUNCTION public.merge_user_accounts(old_id uuid, new_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_profile public.profiles%ROWTYPE;
  old_username text;
BEGIN
  IF old_id IS NULL OR new_id IS NULL OR old_id = new_id THEN
    RETURN;
  END IF;

  SELECT * INTO old_profile FROM public.profiles WHERE id = old_id;

  -------------------------------------------------------------------------
  -- 1. Copy scalar profile data (prefer higher gamification, fill blanks)
  -------------------------------------------------------------------------
  IF old_profile.id IS NOT NULL THEN
    -- Free up the old username so the new profile can adopt it if empty
    old_username := old_profile.username;
    UPDATE public.profiles SET username = NULL WHERE id = old_id;

    UPDATE public.profiles SET
      xp             = GREATEST(COALESCE(xp,0),             COALESCE(old_profile.xp,0)),
      weekly_xp      = GREATEST(COALESCE(weekly_xp,0),      COALESCE(old_profile.weekly_xp,0)),
      computed_level = GREATEST(COALESCE(computed_level,1), COALESCE(old_profile.computed_level,1)),
      current_streak = GREATEST(COALESCE(current_streak,0), COALESCE(old_profile.current_streak,0)),
      longest_streak = GREATEST(COALESCE(longest_streak,0), COALESCE(old_profile.longest_streak,0)),
      username       = COALESCE(username, CASE
                          WHEN old_username IS NOT NULL
                           AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = old_username AND id <> new_id)
                          THEN old_username END),
      display_name   = COALESCE(display_name, old_profile.display_name),
      bio            = COALESCE(bio,          old_profile.bio),
      role           = COALESCE(role,         old_profile.role),
      stream         = COALESCE(stream,       old_profile.stream),
      avatar_url     = COALESCE(avatar_url,   old_profile.avatar_url)
    WHERE id = new_id;
  END IF;

  -------------------------------------------------------------------------
  -- 2. Pre-resolve unique-constraint conflicts by dropping duplicates
  --    from the OLD side. The new account's row wins.
  -------------------------------------------------------------------------
  DELETE FROM public.user_settings   WHERE user_id = old_id AND EXISTS (SELECT 1 FROM public.user_settings   WHERE user_id = new_id);
  DELETE FROM public.user_roles      WHERE user_id = old_id AND role IN  (SELECT role      FROM public.user_roles      WHERE user_id = new_id);
  DELETE FROM public.user_badges     WHERE user_id = old_id AND badge_key IN (SELECT badge_key FROM public.user_badges  WHERE user_id = new_id);
  DELETE FROM public.feedback_votes  WHERE user_id = old_id AND feedback_id IN (SELECT feedback_id FROM public.feedback_votes WHERE user_id = new_id);

  -- Skill progress: prefer the more advanced status from either side, then dedupe
  WITH old_rows AS (
    SELECT skill_id, status FROM public.user_skill_progress WHERE user_id = old_id
  ), status_rank AS (
    SELECT unnest(ARRAY['not_started','in_progress','completed']) AS s,
           generate_series(0,2) AS r
  )
  UPDATE public.user_skill_progress new_row
     SET status = old_rows.status
    FROM old_rows, status_rank sr_new, status_rank sr_old
   WHERE new_row.user_id = new_id
     AND new_row.skill_id = old_rows.skill_id
     AND sr_new.s = new_row.status
     AND sr_old.s = old_rows.status
     AND sr_old.r > sr_new.r;
  DELETE FROM public.user_skill_progress WHERE user_id = old_id AND skill_id IN
    (SELECT skill_id FROM public.user_skill_progress WHERE user_id = new_id);

  DELETE FROM public.peer_chat_settings WHERE user_id = old_id AND peer_id IN
    (SELECT peer_id FROM public.peer_chat_settings WHERE user_id = new_id);

  -- Friendships: kill would-be duplicates and self-links proactively
  DELETE FROM public.friendships
   WHERE (requester_id = old_id AND addressee_id = new_id)
      OR (requester_id = new_id AND addressee_id = old_id);
  DELETE FROM public.friendships f1
   WHERE f1.requester_id = old_id
     AND EXISTS (SELECT 1 FROM public.friendships f2
                  WHERE f2.requester_id = new_id AND f2.addressee_id = f1.addressee_id);
  DELETE FROM public.friendships f1
   WHERE f1.addressee_id = old_id
     AND EXISTS (SELECT 1 FROM public.friendships f2
                  WHERE f2.addressee_id = new_id AND f2.requester_id = f1.requester_id);

  DELETE FROM public.blocked_users
   WHERE (blocker_id = old_id AND blocked_id = new_id)
      OR (blocker_id = new_id AND blocked_id = old_id);
  DELETE FROM public.blocked_users b1
   WHERE b1.blocker_id = old_id
     AND EXISTS (SELECT 1 FROM public.blocked_users b2
                  WHERE b2.blocker_id = new_id AND b2.blocked_id = b1.blocked_id);
  DELETE FROM public.blocked_users b1
   WHERE b1.blocked_id = old_id
     AND EXISTS (SELECT 1 FROM public.blocked_users b2
                  WHERE b2.blocked_id = new_id AND b2.blocker_id = b1.blocker_id);

  -------------------------------------------------------------------------
  -- 3. Straight reassignment (no more conflicts expected)
  -------------------------------------------------------------------------
  UPDATE public.user_roles           SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.user_badges          SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.user_skill_progress  SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.user_custom_skills   SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.user_settings        SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.notifications        SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.feedback             SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.feedback_votes       SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.peer_chat_settings   SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.peer_guidance_requests SET user_id = new_id WHERE user_id = old_id;

  UPDATE public.friendships          SET requester_id = new_id WHERE requester_id = old_id;
  UPDATE public.friendships          SET addressee_id = new_id WHERE addressee_id = old_id;
  DELETE FROM public.friendships     WHERE requester_id = addressee_id;

  UPDATE public.blocked_users        SET blocker_id = new_id WHERE blocker_id = old_id;
  UPDATE public.blocked_users        SET blocked_id = new_id WHERE blocked_id = old_id;
  DELETE FROM public.blocked_users   WHERE blocker_id = blocked_id;

  UPDATE public.peer_messages        SET from_user_id = new_id WHERE from_user_id = old_id;
  UPDATE public.peer_messages        SET to_user_id   = new_id WHERE to_user_id   = old_id;
  DELETE FROM public.peer_messages   WHERE from_user_id = to_user_id;
  UPDATE public.peer_messages
     SET deleted_for_user_ids = (
       SELECT ARRAY(SELECT DISTINCT x FROM unnest(array_replace(deleted_for_user_ids, old_id, new_id)) AS x)
     )
   WHERE old_id = ANY(deleted_for_user_ids) OR new_id = ANY(deleted_for_user_ids);

  UPDATE public.call_signals         SET from_user_id = new_id WHERE from_user_id = old_id;
  UPDATE public.call_signals         SET to_user_id   = new_id WHERE to_user_id   = old_id;
  DELETE FROM public.call_signals    WHERE from_user_id = to_user_id;

  UPDATE public.reports              SET reporter_id       = new_id WHERE reporter_id       = old_id;
  UPDATE public.reports              SET reported_user_id  = new_id WHERE reported_user_id  = old_id;
  DELETE FROM public.reports         WHERE reporter_id = reported_user_id;

  UPDATE public.audit_logs           SET actor_user_id  = new_id WHERE actor_user_id  = old_id;
  UPDATE public.audit_logs           SET target_user_id = new_id WHERE target_user_id = old_id;

  UPDATE public.profiles             SET suspended_by = new_id WHERE suspended_by = old_id;

  -------------------------------------------------------------------------
  -- 4. Retire the old identity
  -------------------------------------------------------------------------
  DELETE FROM public.profiles WHERE id = old_id;
  DELETE FROM auth.users WHERE id = old_id;

  -- Audit trail
  INSERT INTO public.audit_logs (actor_user_id, target_user_id, action, metadata)
  VALUES (new_id, new_id, 'account_merged',
          jsonb_build_object('merged_from', old_id, 'merged_at', now()));
EXCEPTION WHEN OTHERS THEN
  -- Never let a merge failure block a new sign-up
  RAISE WARNING 'merge_user_accounts(%, %) failed: %', old_id, new_id, SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_user_accounts(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Loop over EVERY legacy account with the same email (oldest first)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  legacy_id uuid;
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name',
                            NEW.raw_user_meta_data->>'full_name',
                            NEW.email));

  IF NEW.email IS NOT NULL THEN
    FOR legacy_id IN
      SELECT u.id
        FROM auth.users u
       WHERE u.id <> NEW.id
         AND lower(u.email) = lower(NEW.email)
       ORDER BY u.created_at ASC
    LOOP
      PERFORM public.merge_user_accounts(legacy_id, NEW.id);
    END LOOP;

    IF lower(NEW.email) = 'pankajiditz@gmail.com' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'admin'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
