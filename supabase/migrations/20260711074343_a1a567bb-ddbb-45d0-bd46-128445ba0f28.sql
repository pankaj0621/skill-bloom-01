-- OTP verification requests (server-side only; edge functions use service_role)
CREATE TABLE public.otp_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  verified BOOLEAN NOT NULL DEFAULT false,
  request_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified_at TIMESTAMPTZ
);

CREATE INDEX otp_verifications_phone_idx ON public.otp_verifications (phone_number, created_at DESC);
CREATE INDEX otp_verifications_expires_idx ON public.otp_verifications (expires_at);

-- No client access; only service_role (edge functions) reads/writes this table
GRANT ALL ON public.otp_verifications TO service_role;

ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Explicit deny-by-default: no policies for anon/authenticated means no access.
-- (RLS is on, no policies -> zero rows visible to client roles.)

-- Add phone_number to profiles (unique, nullable)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_number_unique
  ON public.profiles (phone_number)
  WHERE phone_number IS NOT NULL;

-- Guard: users cannot self-edit their phone_number from the client
-- (extend existing guard_profile_protected_fields trigger)
CREATE OR REPLACE FUNCTION public.guard_profile_protected_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean := false;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT public.has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  END IF;

  IF is_admin THEN
    RETURN NEW;
  END IF;

  IF NEW.xp IS DISTINCT FROM OLD.xp
     OR NEW.weekly_xp IS DISTINCT FROM OLD.weekly_xp
     OR NEW.computed_level IS DISTINCT FROM OLD.computed_level
     OR NEW.current_streak IS DISTINCT FROM OLD.current_streak
     OR NEW.longest_streak IS DISTINCT FROM OLD.longest_streak
     OR NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
     OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
     OR NEW.suspended_until IS DISTINCT FROM OLD.suspended_until
     OR NEW.suspended_by IS DISTINCT FROM OLD.suspended_by
     OR NEW.suspend_reason IS DISTINCT FROM OLD.suspend_reason
     OR NEW.phone_number IS DISTINCT FROM OLD.phone_number
  THEN
    RAISE EXCEPTION 'Not authorized to modify protected profile fields';
  END IF;

  RETURN NEW;
END;
$function$;
