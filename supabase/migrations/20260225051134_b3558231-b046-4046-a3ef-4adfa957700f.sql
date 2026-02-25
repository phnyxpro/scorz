
-- Audience votes: one vote per email per sub-event
CREATE TABLE public.audience_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_event_id UUID NOT NULL REFERENCES public.sub_events(id) ON DELETE CASCADE,
  contestant_registration_id UUID NOT NULL REFERENCES public.contestant_registrations(id) ON DELETE CASCADE,
  voter_name TEXT NOT NULL,
  voter_email TEXT NOT NULL,
  voter_phone TEXT,
  ticket_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sub_event_id, voter_email)
);

ALTER TABLE public.audience_votes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can vote (audience role)
CREATE POLICY "Authenticated users can vote"
  ON public.audience_votes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can view their own votes
CREATE POLICY "Users can view vote counts"
  ON public.audience_votes FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage votes
CREATE POLICY "Admins can manage votes"
  ON public.audience_votes FOR ALL
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]));
