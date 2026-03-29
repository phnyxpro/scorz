-- Add registration settings to competitions table
ALTER TABLE public.competitions
ADD COLUMN registration_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN registration_start_date TIMESTAMPTZ,
ADD COLUMN registration_end_date TIMESTAMPTZ;

-- Create index for registration queries
CREATE INDEX idx_competitions_registration_enabled ON public.competitions(registration_enabled);
