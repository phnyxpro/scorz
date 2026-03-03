
-- Performance time slots for sub-events
CREATE TABLE public.performance_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_event_id UUID NOT NULL REFERENCES public.sub_events(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL DEFAULT 0,
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  contestant_registration_id UUID REFERENCES public.contestant_registrations(id) ON DELETE SET NULL,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (sub_event_id, slot_index)
);

-- Enable RLS
ALTER TABLE public.performance_slots ENABLE ROW LEVEL SECURITY;

-- Everyone can view slots (needed for booking UI)
CREATE POLICY "Anyone can view slots"
ON public.performance_slots
FOR SELECT
USING (true);

-- Admins and organizers can manage slots
CREATE POLICY "Admins and organizers can manage slots"
ON public.performance_slots
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]));

-- Contestants can book (update) unbooked slots
CREATE POLICY "Contestants can book available slots"
ON public.performance_slots
FOR UPDATE
USING (
  is_booked = false
  AND has_any_role(auth.uid(), ARRAY['contestant'::app_role])
);

-- Trigger for updated_at
CREATE TRIGGER update_performance_slots_updated_at
BEFORE UPDATE ON public.performance_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
