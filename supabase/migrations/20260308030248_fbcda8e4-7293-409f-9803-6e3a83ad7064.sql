ALTER TABLE public.competition_levels
  ADD COLUMN advancement_count integer,
  ADD COLUMN special_entries jsonb NOT NULL DEFAULT '[]'::jsonb;