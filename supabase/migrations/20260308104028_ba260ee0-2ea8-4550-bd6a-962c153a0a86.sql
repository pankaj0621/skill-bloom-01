
-- Add XP columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_weekly_reset timestamp with time zone;

-- Function to award XP when skills are completed
CREATE OR REPLACE FUNCTION public.award_xp_on_skill_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  xp_amount integer;
BEGIN
  -- Only award XP when status changes to 'completed'
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status != 'completed') THEN
    -- Base XP: 25 per skill completed
    xp_amount := 25;
    
    UPDATE public.profiles
    SET xp = xp + xp_amount,
        weekly_xp = weekly_xp + xp_amount
    WHERE id = NEW.user_id;
    
    -- Check for XP milestone notifications
    PERFORM pg_notify('xp_earned', json_build_object(
      'user_id', NEW.user_id,
      'xp', xp_amount
    )::text);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_skill_complete_xp
  AFTER INSERT OR UPDATE ON public.user_skill_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.award_xp_on_skill_complete();

-- Award XP for streak milestones  
CREATE OR REPLACE FUNCTION public.award_xp_on_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bonus integer := 0;
BEGIN
  IF NEW.current_streak IS DISTINCT FROM OLD.current_streak AND NEW.current_streak > OLD.current_streak THEN
    -- Daily streak XP: 5 per day
    bonus := 5;
    
    -- Milestone bonuses
    IF NEW.current_streak = 7 THEN bonus := bonus + 50; END IF;
    IF NEW.current_streak = 14 THEN bonus := bonus + 75; END IF;
    IF NEW.current_streak = 30 THEN bonus := bonus + 150; END IF;
    
    UPDATE public.profiles
    SET xp = xp + bonus,
        weekly_xp = weekly_xp + bonus
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_streak_xp
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.award_xp_on_streak();

-- Award XP when earning badges
CREATE OR REPLACE FUNCTION public.award_xp_on_badge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET xp = xp + 50,
      weekly_xp = weekly_xp + 50
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_badge_xp
  AFTER INSERT ON public.user_badges
  FOR EACH ROW
  EXECUTE FUNCTION public.award_xp_on_badge();
