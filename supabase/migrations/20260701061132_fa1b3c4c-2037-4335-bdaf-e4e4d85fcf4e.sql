
-- 1. Add new columns
ALTER TABLE public.peer_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_for_everyone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_for_user_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[];

-- 2. Replace the old strict "no edits allowed" trigger with rules that permit
--    edit-by-sender-within-15min and delete flag toggles by involved users.
CREATE OR REPLACE FUNCTION public.enforce_peer_message_mutation_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  -- Immutable participants + creation time
  IF NEW.from_user_id IS DISTINCT FROM OLD.from_user_id THEN
    RAISE EXCEPTION 'Sender cannot be modified';
  END IF;
  IF NEW.to_user_id IS DISTINCT FROM OLD.to_user_id THEN
    RAISE EXCEPTION 'Recipient cannot be modified';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'created_at cannot be modified';
  END IF;

  -- Body edits: only sender, within 15 minutes, and not after delete-for-everyone
  IF NEW.body IS DISTINCT FROM OLD.body THEN
    IF uid IS DISTINCT FROM OLD.from_user_id THEN
      RAISE EXCEPTION 'Only the sender can edit a message';
    END IF;
    IF OLD.deleted_for_everyone THEN
      RAISE EXCEPTION 'Deleted messages cannot be edited';
    END IF;
    IF OLD.created_at < now() - interval '15 minutes' THEN
      RAISE EXCEPTION 'Edit window has expired (15 minutes)';
    END IF;
    IF char_length(NEW.body) = 0 OR char_length(NEW.body) > 5000 THEN
      RAISE EXCEPTION 'Message body must be between 1 and 5000 characters';
    END IF;
    NEW.edited_at := now();
  END IF;

  -- Delete-for-everyone: only sender can flip it, only from false -> true
  IF NEW.deleted_for_everyone IS DISTINCT FROM OLD.deleted_for_everyone THEN
    IF uid IS DISTINCT FROM OLD.from_user_id THEN
      RAISE EXCEPTION 'Only the sender can delete for everyone';
    END IF;
    IF OLD.deleted_for_everyone = true AND NEW.deleted_for_everyone = false THEN
      RAISE EXCEPTION 'Cannot un-delete a message';
    END IF;
  END IF;

  -- Delete-for-me: user may only add their own uid, not remove or add others
  IF NEW.deleted_for_user_ids IS DISTINCT FROM OLD.deleted_for_user_ids THEN
    IF uid IS NULL OR (uid <> OLD.from_user_id AND uid <> OLD.to_user_id) THEN
      RAISE EXCEPTION 'Only participants can delete for themselves';
    END IF;
    -- Every id present in OLD must remain in NEW (append-only)
    IF EXISTS (SELECT 1 FROM unnest(OLD.deleted_for_user_ids) x WHERE x <> ALL(NEW.deleted_for_user_ids)) THEN
      RAISE EXCEPTION 'Cannot remove existing delete-for-me markers';
    END IF;
    -- Only allowed new id is the caller's own uid
    IF EXISTS (
      SELECT 1 FROM unnest(NEW.deleted_for_user_ids) x
      WHERE x <> ALL(OLD.deleted_for_user_ids) AND x <> uid
    ) THEN
      RAISE EXCEPTION 'Can only add your own id to delete-for-me';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Swap old trigger for new one
DROP TRIGGER IF EXISTS prevent_peer_message_body_edit ON public.peer_messages;
DROP TRIGGER IF EXISTS prevent_message_body_edit ON public.peer_messages;
DROP TRIGGER IF EXISTS enforce_peer_message_mutation_rules ON public.peer_messages;

CREATE TRIGGER enforce_peer_message_mutation_rules
  BEFORE UPDATE ON public.peer_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_peer_message_mutation_rules();

-- 3. Update RLS UPDATE policy so both sender AND recipient can update
--    (recipient needs UPDATE to add themselves to deleted_for_user_ids and to mark read).
--    Existing granular field protection is enforced by the trigger above.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'peer_messages' AND cmd = 'UPDATE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.peer_messages', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Participants can update their peer messages"
  ON public.peer_messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id)
  WITH CHECK (auth.uid() = from_user_id OR auth.uid() = to_user_id);
