
-- Add streak columns to profiles
ALTER TABLE public.profiles
ADD COLUMN current_streak INT NOT NULL DEFAULT 0,
ADD COLUMN longest_streak INT NOT NULL DEFAULT 0,
ADD COLUMN last_activity_date DATE;
