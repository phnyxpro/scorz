ALTER TABLE public.competitions
  ADD COLUMN registration_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN registration_start_at timestamptz,
  ADD COLUMN registration_end_at timestamptz;