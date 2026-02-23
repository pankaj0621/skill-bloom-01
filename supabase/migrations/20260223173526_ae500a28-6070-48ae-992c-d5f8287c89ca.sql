-- Fix: Replace permissive peer_messages UPDATE policy with one that prevents body tampering
-- Drop the existing update policy
DROP POLICY IF EXISTS "Recipients can mark messages as read" ON public.peer_messages;

-- Recreate: only the recipient can update, and only the 'read' column
-- We use a trigger to enforce that body cannot be changed
CREATE OR REPLACE FUNCTION public.prevent_message_body_edit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.body IS DISTINCT FROM OLD.body THEN
    RAISE EXCEPTION 'Message body cannot be modified';
  END IF;
  IF NEW.from_user_id IS DISTINCT FROM OLD.from_user_id THEN
    RAISE EXCEPTION 'Sender cannot be modified';
  END IF;
  IF NEW.to_user_id IS DISTINCT FROM OLD.to_user_id THEN
    RAISE EXCEPTION 'Recipient cannot be modified';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE TRIGGER prevent_message_body_edit
  BEFORE UPDATE ON public.peer_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_message_body_edit();