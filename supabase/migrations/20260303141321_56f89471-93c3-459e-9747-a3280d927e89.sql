-- Allow witnesses to view scores (witnesses verify the scoring process like tabulators)
CREATE POLICY "Witnesses can view scores"
ON public.judge_scores
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'witness'::app_role));
