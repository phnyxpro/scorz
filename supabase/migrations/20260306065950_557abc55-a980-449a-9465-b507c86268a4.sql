
-- Drop the existing policy and recreate with proper WITH CHECK
DROP POLICY IF EXISTS "Judges can update own uncertified scores" ON public.judge_scores;

CREATE POLICY "Judges can update own uncertified scores"
ON public.judge_scores
FOR UPDATE
TO authenticated
USING ((auth.uid() = judge_id) AND (is_certified = false))
WITH CHECK (auth.uid() = judge_id);
