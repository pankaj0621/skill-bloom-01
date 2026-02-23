
-- Add username column to profiles
ALTER TABLE public.profiles 
ADD COLUMN username text UNIQUE;

-- Add check constraint for username format (lowercase alphanumeric + underscore, 3-30 chars)
CREATE OR REPLACE FUNCTION public.validate_username()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS NOT NULL THEN
    IF NEW.username !~ '^[a-z0-9_]{3,30}$' THEN
      RAISE EXCEPTION 'Username must be 3-30 characters, lowercase alphanumeric and underscores only';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_username_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_username();

-- Track how many times username has been changed
ALTER TABLE public.profiles 
ADD COLUMN username_changes integer NOT NULL DEFAULT 0;

-- Create index for fast username lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);
