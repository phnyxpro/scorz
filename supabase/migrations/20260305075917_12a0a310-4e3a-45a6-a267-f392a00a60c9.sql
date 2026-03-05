
-- 1. Add is_chief column to sub_event_assignments
ALTER TABLE public.sub_event_assignments ADD COLUMN is_chief boolean NOT NULL DEFAULT false;

-- 2. Migrate existing chief_judge assignments to judge with is_chief
UPDATE public.sub_event_assignments SET role = 'judge'::app_role, is_chief = true WHERE role = 'chief_judge'::app_role;

-- 3. Ensure chief_judges have judge role in user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'judge'::app_role FROM public.user_roles WHERE role = 'chief_judge'::app_role
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Remove chief_judge user_roles entries
DELETE FROM public.user_roles WHERE role = 'chief_judge'::app_role;

-- 5. Create helper function for sub-event-level chief check
CREATE OR REPLACE FUNCTION public.is_chief_for_sub_event(_user_id uuid, _sub_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sub_event_assignments
    WHERE user_id = _user_id
      AND sub_event_id = _sub_event_id
      AND role = 'judge'::app_role
      AND is_chief = true
  )
$$;

-- 6. Update chief_judge_certifications RLS
DROP POLICY IF EXISTS "Chief judges can manage certifications" ON public.chief_judge_certifications;
CREATE POLICY "Chief judges can manage certifications"
ON public.chief_judge_certifications
FOR ALL
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role])
  OR is_chief_for_sub_event(auth.uid(), sub_event_id)
)
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role])
  OR is_chief_for_sub_event(auth.uid(), sub_event_id)
);

-- 7. Update judge_scores RLS for chief access
DROP POLICY IF EXISTS "Admins and chiefs can view all scores" ON public.judge_scores;
CREATE POLICY "Admins and chiefs can view all scores"
ON public.judge_scores
FOR SELECT
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role])
  OR is_chief_for_sub_event(auth.uid(), sub_event_id)
);
