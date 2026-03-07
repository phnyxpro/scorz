ALTER TABLE public.contestant_registrations DROP CONSTRAINT contestant_registrations_user_id_competition_id_key;

-- Add a new unique constraint on (email, competition_id) instead to prevent actual duplicate contestants
ALTER TABLE public.contestant_registrations ADD CONSTRAINT contestant_registrations_email_competition_id_key UNIQUE (email, competition_id);