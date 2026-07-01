
-- ─── 1. Attachments + disappearing columns on peer_messages ───
ALTER TABLE public.peer_messages
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_path text,
  ADD COLUMN IF NOT EXISTS media_mime text,
  ADD COLUMN IF NOT EXISTS media_name text,
  ADD COLUMN IF NOT EXISTS media_size bigint,
  ADD COLUMN IF NOT EXISTS media_kind text CHECK (media_kind IS NULL OR media_kind IN ('image','video','audio','file')),
  ADD COLUMN IF NOT EXISTS media_duration_ms integer,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS disappear_seconds integer;

CREATE INDEX IF NOT EXISTS peer_messages_expires_at_idx ON public.peer_messages (expires_at) WHERE expires_at IS NOT NULL;

-- ─── 2. Allow empty body when a media attachment is present ───
CREATE OR REPLACE FUNCTION public.validate_peer_message_body()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF char_length(COALESCE(NEW.body, '')) > 5000 THEN
    RAISE EXCEPTION 'Message body must be 5000 characters or fewer';
  END IF;
  IF char_length(COALESCE(NEW.body, '')) = 0 AND NEW.media_url IS NULL THEN
    RAISE EXCEPTION 'Message must have body or media';
  END IF;
  RETURN NEW;
END;
$function$;

-- Update mutation-rules trigger so body can be empty when media attached
CREATE OR REPLACE FUNCTION public.enforce_peer_message_mutation_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF NEW.from_user_id IS DISTINCT FROM OLD.from_user_id THEN
    RAISE EXCEPTION 'Sender cannot be modified';
  END IF;
  IF NEW.to_user_id IS DISTINCT FROM OLD.to_user_id THEN
    RAISE EXCEPTION 'Recipient cannot be modified';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'created_at cannot be modified';
  END IF;

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
    IF char_length(COALESCE(NEW.body, '')) > 5000 THEN
      RAISE EXCEPTION 'Message body must be 5000 characters or fewer';
    END IF;
    IF char_length(COALESCE(NEW.body, '')) = 0 AND NEW.media_url IS NULL THEN
      RAISE EXCEPTION 'Message must have body or media';
    END IF;
    NEW.edited_at := now();
  END IF;

  IF NEW.deleted_for_everyone IS DISTINCT FROM OLD.deleted_for_everyone THEN
    IF uid IS DISTINCT FROM OLD.from_user_id THEN
      RAISE EXCEPTION 'Only the sender can delete for everyone';
    END IF;
    IF OLD.deleted_for_everyone = true AND NEW.deleted_for_everyone = false THEN
      RAISE EXCEPTION 'Cannot un-delete a message';
    END IF;
  END IF;

  IF NEW.deleted_for_user_ids IS DISTINCT FROM OLD.deleted_for_user_ids THEN
    IF uid IS NULL OR (uid <> OLD.from_user_id AND uid <> OLD.to_user_id) THEN
      RAISE EXCEPTION 'Only participants can delete for themselves';
    END IF;
    IF EXISTS (SELECT 1 FROM unnest(OLD.deleted_for_user_ids) x WHERE x <> ALL(NEW.deleted_for_user_ids)) THEN
      RAISE EXCEPTION 'Cannot remove existing delete-for-me markers';
    END IF;
    IF EXISTS (
      SELECT 1 FROM unnest(NEW.deleted_for_user_ids) x
      WHERE x <> ALL(OLD.deleted_for_user_ids) AND x <> uid
    ) THEN
      RAISE EXCEPTION 'Can only add your own id to delete-for-me';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ─── 3. Per-chat disappearing default (per user) ───
CREATE TABLE IF NOT EXISTS public.peer_chat_settings (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  peer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  disappear_seconds integer,  -- NULL = off
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, peer_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.peer_chat_settings TO authenticated;
GRANT ALL ON public.peer_chat_settings TO service_role;

ALTER TABLE public.peer_chat_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own chat settings"
  ON public.peer_chat_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 4. Cleanup function for expired messages (call from client best-effort) ───
CREATE OR REPLACE FUNCTION public.cleanup_expired_peer_messages()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  deleted_count integer;
BEGIN
  IF uid IS NULL THEN
    RETURN 0;
  END IF;
  WITH d AS (
    DELETE FROM public.peer_messages
    WHERE expires_at IS NOT NULL
      AND expires_at < now()
      AND (from_user_id = uid OR to_user_id = uid)
    RETURNING 1
  )
  SELECT count(*) INTO deleted_count FROM d;
  RETURN deleted_count;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_peer_messages() TO authenticated;
