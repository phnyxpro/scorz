-- Add scoring settings columns to sub_events table
ALTER TABLE public.sub_events
ADD COLUMN timer_visible boolean NOT NULL DEFAULT true,
ADD COLUMN comments_visible boolean NOT NULL DEFAULT true;

-- Update existing sub_events to have default values
UPDATE public.sub_events SET timer_visible = true, comments_visible = true WHERE timer_visible IS NULL;