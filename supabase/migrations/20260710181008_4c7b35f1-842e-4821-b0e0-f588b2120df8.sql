
-- Account linking: merge legacy email accounts into new Google sign-ups by email
-- Also auto-promote pankajiditz@gmail.com to admin

CREATE OR REPLACE FUNCTION public.merge_user_accounts(old_id uuid, new_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_profile public.profiles%ROWTYPE;
  new_profile public.profiles%ROWTYPE;
BEGIN
  IF old_id IS NULL OR new_id IS NULL OR old_id = new_id THEN
    RETURN;
  END IF;

  SELECT * INTO old_profile FROM public.profiles WHERE id = old_id;
  SELECT * INTO new_profile FROM public.profiles WHERE id = new_id;

  -- Copy over legacy gamification/onboarding data if old profile exists
  IF old_profile.id IS NOT NULL THEN
    UPDATE public.profiles SET
      xp             = GREATEST(COALESCE(xp,0),             COALESCE(old_profile.xp,0)),
      weekly_xp      = GREATEST(COALESCE(weekly_xp,0),      COALESCE(old_profile.weekly_xp,0)),
      computed_level = GREATEST(COALESCE(computed_level,1), COALESCE(old_profile.computed_level,1)),
      current_streak = GREATEST(COALESCE(current_streak,0), COALESCE(old_profile.current_streak,0)),
      longest_streak = GREATEST(COALESCE(longest_streak,0), COALESCE(old_profile.longest_streak,0)),
      username      = COALESCE(username,      old_profile.username),
      display_name  = COALESCE(display_name,  old_profile.display_name),
      bio           = COALESCE(bio,           old_profile.bio),
      role          = COALESCE(role,          old_profile.role),
      stream        = COALESCE(stream,        old_profile.stream),
      avatar_url    = COALESCE(avatar_url,    old_profile.avatar_url)
    WHERE id = new_id;
  END IF;

  -- Reassign FK-owned rows. Wrap each in a savepoint to swallow unique conflicts.
  BEGIN UPDATE public.user_roles           SET user_id = new_id WHERE user_id = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN UPDATE public.user_badges          SET user_id = new_id WHERE user_id = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN UPDATE public.user_skill_progress  SET user_id = new_id WHERE user_id = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN UPDATE public.user_custom_skills   SET user_id = new_id WHERE user_id = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN UPDATE public.user_settings        SET user_id = new_id WHERE user_id = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN UPDATE public.notifications        SET user_id = new_id WHERE user_id = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN UPDATE public.feedback             SET user_id = new_id WHERE user_id = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN UPDATE public.feedback_votes       SET user_id = new_id WHERE user_id = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN UPDATE public.peer_chat_settings   SET user_id = new_id WHERE user_id = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN UPDATE public.peer_guidance_requests SET user_id = new_id WHERE user_id = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;

  BEGIN UPDATE public.friendships          SET requester_id = new_id WHERE requester_id = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN UPDATE public.friendships          SET addressee_id = new_id WHERE addressee_id = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;

  BEGIN UPDATE public.blocked_users        SET blocker_id = new_id WHERE blocker_id = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN UPDATE public.blocked_users        SET blocked_id = new_id WHERE blocked_id = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;

  BEGIN UPDATE public.peer_messages        SET from_user_id = new_id WHERE from_user_id = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN UPDATE public.peer_messages        SET to_user_id   = new_id WHERE to_user_id   = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;
  UPDATE public.peer_messages
    SET deleted_for_user_ids = array_replace(deleted_for_user_ids, old_id, new_id)
    WHERE old_id = ANY(deleted_for_user_ids);

  BEGIN UPDATE public.call_signals         SET from_user_id = new_id WHERE from_user_id = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN UPDATE public.call_signals         SET to_user_id   = new_id WHERE to_user_id   = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;

  BEGIN UPDATE public.reports              SET reporter_id       = new_id WHERE reporter_id       = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN UPDATE public.reports              SET reported_user_id  = new_id WHERE reported_user_id  = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;

  BEGIN UPDATE public.audit_logs           SET actor_user_id  = new_id WHERE actor_user_id  = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN UPDATE public.audit_logs           SET target_user_id = new_id WHERE target_user_id = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;

  BEGIN UPDATE public.profiles             SET suspended_by = new_id WHERE suspended_by = old_id; EXCEPTION WHEN unique_violation THEN NULL; END;

  -- Clean up old profile (this must happen before deleting auth user so the
  -- profiles->auth.users FK cascade doesn't wipe already-reassigned rows).
  DELETE FROM public.profiles WHERE id = old_id;

  -- Delete legacy auth user (email/password identity becomes obsolete)
  DELETE FROM auth.users WHERE id = old_id;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_user_accounts(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Replace handle_new_user to auto-merge legacy accounts on Google sign-up
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
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.email));

  -- Look for an older auth user with the same verified email and merge them
  IF NEW.email IS NOT NULL THEN
    SELECT u.id INTO legacy_id
    FROM auth.users u
    WHERE u.id <> NEW.id
      AND lower(u.email) = lower(NEW.email)
    ORDER BY u.created_at ASC
    LIMIT 1;

    IF legacy_id IS NOT NULL THEN
      PERFORM public.merge_user_accounts(legacy_id, NEW.id);
    END IF;

    -- Auto-promote known admin
    IF lower(NEW.email) = 'pankajiditz@gmail.com' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'admin'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
