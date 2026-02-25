
-- Tabulator certifications: one per sub_event
CREATE TABLE public.tabulator_certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_event_id UUID NOT NULL REFERENCES public.sub_events(id) ON DELETE CASCADE,
  tabulator_id UUID NOT NULL,
  digital_vs_physical_match BOOLEAN NOT NULL DEFAULT false,
  discrepancy_notes TEXT,
  tabulator_signature TEXT,
  signed_at TIMESTAMPTZ,
  is_certified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sub_event_id)
);

ALTER TABLE public.tabulator_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tabulator certifications"
  ON public.tabulator_certifications FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Tabulators can manage tabulator certifications"
  ON public.tabulator_certifications FOR ALL
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['tabulator'::app_role, 'admin'::app_role, 'organizer'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['tabulator'::app_role, 'admin'::app_role, 'organizer'::app_role]));

CREATE TRIGGER update_tabulator_certifications_updated_at
  BEFORE UPDATE ON public.tabulator_certifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Witness certifications: one per sub_event
CREATE TABLE public.witness_certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_event_id UUID NOT NULL REFERENCES public.sub_events(id) ON DELETE CASCADE,
  witness_id UUID NOT NULL,
  observations TEXT,
  witness_signature TEXT,
  signed_at TIMESTAMPTZ,
  is_certified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sub_event_id)
);

ALTER TABLE public.witness_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view witness certifications"
  ON public.witness_certifications FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Witnesses can manage witness certifications"
  ON public.witness_certifications FOR ALL
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['witness'::app_role, 'admin'::app_role, 'organizer'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['witness'::app_role, 'admin'::app_role, 'organizer'::app_role]));

CREATE TRIGGER update_witness_certifications_updated_at
  BEFORE UPDATE ON public.witness_certifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
