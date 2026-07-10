
CREATE OR REPLACE FUNCTION public.guard_profile_protected_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean := false;
BEGIN
  -- Only guard when the update is coming from a client session (not from
  -- SECURITY DEFINER triggers/functions owned by postgres/service_role).
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT public.has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  END IF;

  IF is_admin THEN
    RETURN NEW;
  END IF;

  IF NEW.xp IS DISTINCT FROM OLD.xp
     OR NEW.weekly_xp IS DISTINCT FROM OLD.weekly_xp
     OR NEW.computed_level IS DISTINCT FROM OLD.computed_level
     OR NEW.current_streak IS DISTINCT FROM OLD.current_streak
     OR NEW.longest_streak IS DISTINCT FROM OLD.longest_streak
     OR NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
     OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
     OR NEW.suspended_until IS DISTINCT FROM OLD.suspended_until
     OR NEW.suspended_by IS DISTINCT FROM OLD.suspended_by
     OR NEW.suspend_reason IS DISTINCT FROM OLD.suspend_reason
  THEN
    RAISE EXCEPTION 'Not authorized to modify protected profile fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_protected_fields ON public.profiles;
CREATE TRIGGER guard_profile_protected_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_protected_fields();
