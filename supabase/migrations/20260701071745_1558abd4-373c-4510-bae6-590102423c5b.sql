
CREATE OR REPLACE FUNCTION public.mark_peer_messages_seen(_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  n integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _ids IS NULL OR array_length(_ids, 1) IS NULL THEN
    RETURN 0;
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
    WHERE id = ANY(_ids)
      AND to_user_id = uid
      AND read = false
    RETURNING 1
  )
  SELECT count(*) INTO n FROM u;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_peer_messages_seen(uuid[]) TO authenticated;
