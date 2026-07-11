GRANT SELECT ON public.firebase_auth_users TO authenticated;

CREATE POLICY "Users can view own firebase mapping"
  ON public.firebase_auth_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());