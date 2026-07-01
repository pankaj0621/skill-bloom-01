
CREATE OR REPLACE FUNCTION public.mark_peer_messages_read(_from uuid, _to uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  n integer;
BEGIN
  IF uid IS NULL OR uid <> _to THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  WITH u AS (
    UPDATE public.peer_messages
    SET read = true,
        expires_at = CASE
          WHEN expires_at IS NOT NULL THEN expires_at
          WHEN disappear_seconds IS NOT NULL AND disappear_seconds > 0
            THEN now() + make_interval(secs => disappear_seconds)
          ELSE NULL
        END
    WHERE to_user_id = _to
      AND from_user_id = _from
      AND read = false
    RETURNING 1
  )
  SELECT count(*) INTO n FROM u;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_peer_messages_read(uuid, uuid) TO authenticated;
