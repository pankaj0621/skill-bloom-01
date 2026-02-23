
-- Allow authenticated users to view all badges (for public profiles)
DROP POLICY IF EXISTS "Users can view own badges" ON public.user_badges;
CREATE POLICY "Authenticated users can view badges"
ON public.user_badges FOR SELECT
USING (auth.role() = 'authenticated');
