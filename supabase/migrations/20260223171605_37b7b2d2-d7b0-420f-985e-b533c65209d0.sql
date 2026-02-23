-- Add body length constraint via trigger (not CHECK to avoid immutability issues)
CREATE OR REPLACE FUNCTION public.validate_peer_message_body()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF char_length(NEW.body) = 0 OR char_length(NEW.body) > 5000 THEN
    RAISE EXCEPTION 'Message body must be between 1 and 5000 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_peer_message_body_trigger
BEFORE INSERT OR UPDATE ON public.peer_messages
FOR EACH ROW
EXECUTE FUNCTION public.validate_peer_message_body();

-- Restrict profile visibility to authenticated users only
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');
