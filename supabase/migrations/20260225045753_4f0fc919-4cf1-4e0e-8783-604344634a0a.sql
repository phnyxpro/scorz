
-- Chief Judge certifications: one per sub-event
CREATE TABLE public.chief_judge_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_event_id uuid NOT NULL REFERENCES public.sub_events(id) ON DELETE CASCADE UNIQUE,
  chief_judge_id uuid NOT NULL,
  
  -- Tie-breaking
  tie_break_criterion_id uuid REFERENCES public.rubric_criteria(id) ON DELETE SET NULL,
  tie_break_notes text,
  
  -- Penalty adjustments (jsonb: { score_id: adjusted_penalty })
  penalty_adjustments jsonb NOT NULL DEFAULT '{}',
  
  -- Certification
  chief_judge_signature text,
  signed_at timestamptz,
  is_certified boolean NOT NULL DEFAULT false,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chief_judge_certifications ENABLE ROW LEVEL SECURITY;

-- Chief judges can manage their own certifications
CREATE POLICY "Chief judges can manage certifications"
  ON public.chief_judge_certifications FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['chief_judge'::app_role, 'admin'::app_role, 'organizer'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['chief_judge'::app_role, 'admin'::app_role, 'organizer'::app_role]));

-- Authenticated users can view certifications
CREATE POLICY "Authenticated can view certifications"
  ON public.chief_judge_certifications FOR SELECT
  USING (true);

-- Trigger
CREATE TRIGGER update_chief_judge_certifications_updated_at
  BEFORE UPDATE ON public.chief_judge_certifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
