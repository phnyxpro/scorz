
-- Create staff_invitations table for managing staff at competition level
CREATE TABLE public.staff_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role app_role NOT NULL,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  sub_event_id UUID REFERENCES public.sub_events(id) ON DELETE SET NULL,
  invited_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  invited_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(email, role, competition_id)
);

-- Enable RLS
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Admins and organizers can fully manage invitations
CREATE POLICY "Admins and organizers can manage staff_invitations"
  ON public.staff_invitations FOR ALL
  TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]));

-- Staff can view invitations for competitions they're part of
CREATE POLICY "Staff can view own invitations"
  ON public.staff_invitations FOR SELECT
  TO authenticated
  USING (true);
