ALTER TABLE public.competition_levels
ADD COLUMN IF NOT EXISTS is_final_round boolean NOT NULL DEFAULT false;