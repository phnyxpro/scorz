-- Correct RLS Hardening for judge_scores
-- The previous migration incorrectly targeted 'public.scores'

-- 1. Ensure judge_scores has strict RLS
ALTER TABLE public.judge_scores ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies on judge_scores to start clean
DROP POLICY IF EXISTS "Judges can view/insert/update their own scores" ON public.judge_scores;
DROP POLICY IF EXISTS "Admins and organizers can view all scores" ON public.judge_scores;
DROP POLICY IF EXISTS "Chief judges can view all scores" ON public.judge_scores;
DROP POLICY IF EXISTS "Admins and organizers can manage all scores" ON public.judge_scores;
DROP POLICY IF EXISTS "Tabulators can view all scores" ON public.judge_scores;

-- 3. Recreate strict policies for judge_scores

-- Judges can only manage their own scores
CREATE POLICY "Judges can manage their own scores"
  ON public.judge_scores FOR ALL
  TO authenticated
  USING (auth.uid() = judge_id)
  WITH CHECK (auth.uid() = judge_id);

-- Chief Judges, Tabulators, and Witnesses can view scores for their assigned sub_events
CREATE POLICY "Staff can view scores for assigned sub_events"
  ON public.judge_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sub_event_assignments 
      WHERE user_id = auth.uid() 
      AND sub_event_id = judge_scores.sub_event_id
      AND role IN ('chief_judge', 'tabulator', 'witness')
    )
  );

-- Chief Judges and Tabulators can update scores for corrections in their assigned sub_events
CREATE POLICY "Staff can update scores for assigned sub_events"
  ON public.judge_scores FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sub_event_assignments 
      WHERE user_id = auth.uid() 
      AND sub_event_id = judge_scores.sub_event_id
      AND role IN ('chief_judge', 'tabulator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sub_event_assignments 
      WHERE user_id = auth.uid() 
      AND sub_event_id = judge_scores.sub_event_id
      AND role IN ('chief_judge', 'tabulator')
    )
  );

-- Organizers can view scores for their own competitions
CREATE POLICY "Organizers can view scores for their competitions"
  ON public.judge_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.competitions c
      JOIN public.sub_events se ON se.level_id IN (SELECT id FROM public.competition_levels WHERE competition_id = c.id)
      WHERE c.created_by = auth.uid()
      AND se.id = judge_scores.sub_event_id
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to judge_scores"
  ON public.judge_scores FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
