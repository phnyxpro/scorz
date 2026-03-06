-- Run this in your Supabase SQL Editor to apply the migration
ALTER TABLE public.sub_events
ADD COLUMN IF NOT EXISTS timer_visible boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS comments_visible boolean NOT NULL DEFAULT true;
