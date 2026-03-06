
-- Add is_chief flag to staff_invitations
ALTER TABLE public.staff_invitations ADD COLUMN is_chief boolean NOT NULL DEFAULT false;

-- Create junction table for staff-to-sub-event assignments
CREATE TABLE public.staff_invitation_sub_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_invitation_id uuid NOT NULL REFERENCES public.staff_invitations(id) ON DELETE CASCADE,
  sub_event_id uuid NOT NULL REFERENCES public.sub_events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_invitation_id, sub_event_id)
);

-- Enable RLS
ALTER TABLE public.staff_invitation_sub_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins and organizers can manage staff_invitation_sub_events"
  ON public.staff_invitation_sub_events FOR ALL
  TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]));

CREATE POLICY "Staff can view own invitation sub events"
  ON public.staff_invitation_sub_events FOR SELECT
  TO authenticated
  USING (true);
