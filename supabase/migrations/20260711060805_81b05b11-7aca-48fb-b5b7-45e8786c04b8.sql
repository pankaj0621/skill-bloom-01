ALTER TABLE public.firebase_auth_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

ALTER TABLE public.firebase_auth_users ALTER COLUMN phone_number SET NOT NULL;

GRANT SELECT ON public.firebase_auth_users TO authenticated;
GRANT ALL ON public.firebase_auth_users TO service_role;