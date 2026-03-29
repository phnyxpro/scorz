CREATE POLICY "Staff can view registrations"
ON public.contestant_registrations
FOR SELECT
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['judge'::app_role, 'chief_judge'::app_role, 'tabulator'::app_role, 'witness'::app_role])
);