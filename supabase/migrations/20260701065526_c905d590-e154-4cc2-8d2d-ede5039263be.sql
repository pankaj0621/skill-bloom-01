
CREATE OR REPLACE FUNCTION public.validate_peer_message_body()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF char_length(COALESCE(NEW.body, '')) > 5000 THEN
    RAISE EXCEPTION 'Message body must be 5000 characters or fewer';
  END IF;
  IF char_length(COALESCE(NEW.body, '')) = 0 AND NEW.media_path IS NULL THEN
    RAISE EXCEPTION 'Message must have body or media';
  END IF;
  RETURN NEW;
END;
$function$;

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
    IF char_length(COALESCE(NEW.body, '')) = 0 AND NEW.media_path IS NULL THEN
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
