
-- Friendships: only addressee can update (accept/reject); both can still delete
DROP POLICY IF EXISTS "Users can update own friendships" ON public.friendships;
CREATE POLICY "Addressee can update friendship status"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id);

-- Notifications: remove client-side INSERT (only triggers/service role create notifications)
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;

-- User badges: remove client-side INSERT and DELETE (server-side only via triggers/edge functions)
DROP POLICY IF EXISTS "Users can insert own badges" ON public.user_badges;
DROP POLICY IF EXISTS "Users can delete own badges" ON public.user_badges;

-- Revoke EXECUTE on internal SECURITY DEFINER trigger functions from anon/authenticated/public
REVOKE EXECUTE ON FUNCTION public.award_xp_on_skill_complete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_xp_on_streak() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_badge_earned() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_default_settings() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_xp_on_badge() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_feedback_votes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_friend_request() FROM PUBLIC, anon, authenticated;

-- has_role is used inside RLS policies; revoke from anon (never needed) but keep for authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Storage: restrict avatar listing. Public file URLs still work (public bucket bypasses RLS for /object/public)
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Users can list own avatar folder"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
