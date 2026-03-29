-- Create registration_forms table
CREATE TABLE public.registration_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.registration_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and organizers can manage forms"
  ON public.registration_forms FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','organizer']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','organizer']::app_role[]));

CREATE TRIGGER update_registration_forms_updated_at
  BEFORE UPDATE ON public.registration_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_registration_forms_competition_id ON public.registration_forms(competition_id);
