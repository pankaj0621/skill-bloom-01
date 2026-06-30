
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event TEXT NOT NULL CHECK (char_length(event) BETWEEN 1 AND 64),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only: no UPDATE/DELETE grants. SELECT for users; INSERT restricted to service_role.
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own audit entries"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = target_user_id OR auth.uid() = actor_user_id);

CREATE POLICY "Admins view all audit entries"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policies for authenticated; service_role bypasses RLS.

CREATE INDEX idx_audit_logs_target ON public.audit_logs(target_user_id, created_at DESC);
CREATE INDEX idx_audit_logs_event ON public.audit_logs(event, created_at DESC);
