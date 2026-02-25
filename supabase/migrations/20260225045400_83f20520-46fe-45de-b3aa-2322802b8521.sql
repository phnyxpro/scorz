
-- Judge scores: one row per judge per contestant per sub-event
CREATE TABLE public.judge_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_event_id uuid NOT NULL REFERENCES public.sub_events(id) ON DELETE CASCADE,
  judge_id uuid NOT NULL,
  contestant_registration_id uuid NOT NULL REFERENCES public.contestant_registrations(id) ON DELETE CASCADE,
  
  -- Individual criterion scores (jsonb: { criterion_id: score_1_to_5 })
  criterion_scores jsonb NOT NULL DEFAULT '{}',
  
  -- Computed totals (denormalized for quick reads)
  raw_total numeric NOT NULL DEFAULT 0,
  
  -- Timer
  performance_duration_seconds numeric,
  time_penalty numeric NOT NULL DEFAULT 0,
  
  -- Final
  final_score numeric NOT NULL DEFAULT 0,
  
  -- Comments
  comments text,
  
  -- Certification
  judge_signature text,
  signed_at timestamptz,
  is_certified boolean NOT NULL DEFAULT false,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(sub_event_id, judge_id, contestant_registration_id)
);

ALTER TABLE public.judge_scores ENABLE ROW LEVEL SECURITY;

-- Judges can only see their own scores
CREATE POLICY "Judges can view own scores"
  ON public.judge_scores FOR SELECT
  USING (auth.uid() = judge_id);

-- Judges can insert their own scores
CREATE POLICY "Judges can create own scores"
  ON public.judge_scores FOR INSERT
  WITH CHECK (auth.uid() = judge_id);

-- Judges can update their own uncertified scores
CREATE POLICY "Judges can update own uncertified scores"
  ON public.judge_scores FOR UPDATE
  USING (auth.uid() = judge_id AND is_certified = false);

-- Admins/organizers/chief_judge can view all scores
CREATE POLICY "Admins and chiefs can view all scores"
  ON public.judge_scores FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role, 'chief_judge'::app_role]));

-- Admins can manage all scores
CREATE POLICY "Admins can manage all scores"
  ON public.judge_scores FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]));

-- Tabulators can view scores
CREATE POLICY "Tabulators can view scores"
  ON public.judge_scores FOR SELECT
  USING (has_role(auth.uid(), 'tabulator'::app_role));

-- Trigger
CREATE TRIGGER update_judge_scores_updated_at
  BEFORE UPDATE ON public.judge_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
