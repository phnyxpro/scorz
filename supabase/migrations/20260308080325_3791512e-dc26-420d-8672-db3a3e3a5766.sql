ALTER TABLE public.competitions
ADD COLUMN registration_form_config jsonb NOT NULL DEFAULT '{}'::jsonb;