DROP POLICY "Staff can view assigned registrations" ON contestant_registrations;

CREATE POLICY "Staff can view competition registrations"
ON contestant_registrations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM sub_event_assignments sa
    JOIN sub_events se ON se.id = sa.sub_event_id
    JOIN competition_levels cl ON cl.id = se.level_id
    WHERE sa.user_id = auth.uid()
      AND cl.competition_id = contestant_registrations.competition_id
      AND sa.role = ANY(ARRAY['judge'::app_role, 'tabulator'::app_role, 'witness'::app_role])
  )
);