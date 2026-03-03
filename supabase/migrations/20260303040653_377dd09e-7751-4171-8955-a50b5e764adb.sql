
-- Add sort_order column to contestant_registrations for performance ordering
ALTER TABLE public.contestant_registrations ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Add RLS policy for contestants to view their own scores after certification
CREATE POLICY "Contestants can view own certified scores"
ON public.judge_scores
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contestant_registrations cr
    WHERE cr.id = judge_scores.contestant_registration_id
    AND cr.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.chief_judge_certifications cjc
    WHERE cjc.sub_event_id = judge_scores.sub_event_id
    AND cjc.is_certified = true
  )
);
