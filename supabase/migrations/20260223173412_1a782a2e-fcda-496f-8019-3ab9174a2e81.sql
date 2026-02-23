-- Fix: Change is_own_record from SECURITY DEFINER to SECURITY INVOKER
-- auth.uid() is accessible to authenticated users, so DEFINER is unnecessary
CREATE OR REPLACE FUNCTION public.is_own_record(record_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() = record_user_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;