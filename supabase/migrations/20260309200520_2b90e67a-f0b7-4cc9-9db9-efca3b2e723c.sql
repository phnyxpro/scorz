
-- Change unique constraint to allow same contestant in multiple sub-events
ALTER TABLE public.contestant_registrations
  DROP CONSTRAINT IF EXISTS contestant_registrations_email_competition_id_key;

ALTER TABLE public.contestant_registrations
  ADD CONSTRAINT contestant_registrations_email_competition_sub_event_key
  UNIQUE (email, competition_id, sub_event_id);

-- Add INSERT policy for tabulators to create advancement registrations
CREATE POLICY "Tabulators can insert registrations for advancement"
ON public.contestant_registrations
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'tabulator'::app_role));
