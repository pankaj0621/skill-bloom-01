-- Fix #1: Replace broad profiles SELECT with authenticated-only (already done previously, but ensure it's correct)
-- The current policy "Authenticated users can view profiles" with USING (auth.role() = 'authenticated') is fine
-- for leaderboard/peer discovery. No change needed there.

-- Fix #2: Add DELETE policy for user_badges (own badges only)
CREATE POLICY "Users can delete own badges"
  ON public.user_badges FOR DELETE
  USING (is_own_record(user_id));

-- Fix #3: Add DELETE policy for peer_messages (sender or recipient)
CREATE POLICY "Users can delete own messages"
  ON public.peer_messages FOR DELETE
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Fix #4: Add DELETE policy for profiles (own profile only)
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);
