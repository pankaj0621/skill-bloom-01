
-- Allow authenticated users to view all skill progress (for public profiles)
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_skill_progress;
CREATE POLICY "Authenticated users can view progress"
ON public.user_skill_progress FOR SELECT
USING (auth.role() = 'authenticated');
