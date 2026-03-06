
-- Table to store timer events (start/stop) per contestant per sub-event per tabulator
CREATE TABLE public.performance_timer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_event_id uuid NOT NULL REFERENCES public.sub_events(id) ON DELETE CASCADE,
  contestant_registration_id uuid NOT NULL REFERENCES public.contestant_registrations(id) ON DELETE CASCADE,
  tabulator_id uuid NOT NULL,
  event_type text NOT NULL DEFAULT 'start', -- 'start' or 'stop'
  elapsed_seconds numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.performance_timer_events ENABLE ROW LEVEL SECURITY;

-- Tabulators can manage timer events
CREATE POLICY "Tabulators can manage timer events"
ON public.performance_timer_events
FOR ALL
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['tabulator'::app_role, 'admin'::app_role, 'organizer'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['tabulator'::app_role, 'admin'::app_role, 'organizer'::app_role]));

-- Staff can view timer events (judges need to see)
CREATE POLICY "Staff can view timer events"
ON public.performance_timer_events
FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['judge'::app_role, 'chief_judge'::app_role, 'witness'::app_role]));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.performance_timer_events;

-- Also store the final computed duration per contestant per tabulator
CREATE TABLE public.performance_durations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_event_id uuid NOT NULL REFERENCES public.sub_events(id) ON DELETE CASCADE,
  contestant_registration_id uuid NOT NULL REFERENCES public.contestant_registrations(id) ON DELETE CASCADE,
  tabulator_id uuid NOT NULL,
  duration_seconds numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sub_event_id, contestant_registration_id, tabulator_id)
);

ALTER TABLE public.performance_durations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tabulators can manage durations"
ON public.performance_durations
FOR ALL
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['tabulator'::app_role, 'admin'::app_role, 'organizer'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['tabulator'::app_role, 'admin'::app_role, 'organizer'::app_role]));

CREATE POLICY "Staff can view durations"
ON public.performance_durations
FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['judge'::app_role, 'chief_judge'::app_role, 'witness'::app_role]));

ALTER PUBLICATION supabase_realtime ADD TABLE public.performance_durations;
