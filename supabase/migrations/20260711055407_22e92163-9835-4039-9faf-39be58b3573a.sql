CREATE TABLE public.firebase_auth_users (
  firebase_uid text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text,
  created_at timestamptz DEFAULT now()
);

GRANT ALL ON public.firebase_auth_users TO service_role;

ALTER TABLE public.firebase_auth_users ENABLE ROW LEVEL SECURITY;