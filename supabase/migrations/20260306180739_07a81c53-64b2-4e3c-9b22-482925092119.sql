
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS active_scoring_level_id UUID REFERENCES public.competition_levels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS active_scoring_sub_event_id UUID REFERENCES public.sub_events(id) ON DELETE SET NULL;

ALTER TABLE public.sub_events
  ADD COLUMN IF NOT EXISTS timer_visible BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS comments_visible BOOLEAN NOT NULL DEFAULT true;
