
-- Fix skill_tracks: restrict to authenticated users only
DROP POLICY IF EXISTS "Authenticated users can view skill tracks" ON public.skill_tracks;
CREATE POLICY "Authenticated users can view skill tracks"
ON public.skill_tracks
FOR SELECT
USING (auth.role() = 'authenticated');

-- Fix skills: restrict to authenticated users only
DROP POLICY IF EXISTS "Authenticated users can view skills" ON public.skills;
CREATE POLICY "Authenticated users can view skills"
ON public.skills
FOR SELECT
USING (auth.role() = 'authenticated');
