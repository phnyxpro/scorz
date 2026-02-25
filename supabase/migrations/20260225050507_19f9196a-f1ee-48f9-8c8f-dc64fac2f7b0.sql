
-- Sub-event role assignments
CREATE TABLE public.sub_event_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_event_id UUID NOT NULL REFERENCES public.sub_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sub_event_id, user_id, role)
);

ALTER TABLE public.sub_event_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view assignments"
  ON public.sub_event_assignments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins and organizers can manage assignments"
  ON public.sub_event_assignments FOR ALL
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]));
