ALTER TABLE public.sub_events ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_sub_events_level_sort ON public.sub_events(level_id, sort_order);