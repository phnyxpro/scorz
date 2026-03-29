
-- Replace blanket staff SELECT policy with one scoped to assigned sub-events
DROP POLICY IF EXISTS "Staff can view registrations" ON public.contestant_registrations;

CREATE POLICY "Staff can view assigned registrations"
ON public.contestant_registrations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sub_event_assignments sa
    WHERE sa.user_id = auth.uid()
      AND sa.sub_event_id = contestant_registrations.sub_event_id
      AND sa.role IN ('judge'::app_role, 'tabulator'::app_role, 'witness'::app_role)
  )
);
