
DROP POLICY IF EXISTS "Witnesses can manage witness certifications" ON public.witness_certifications;
CREATE POLICY "Witnesses and tabulators can manage witness certifications"
  ON public.witness_certifications
  FOR ALL
  TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['witness'::app_role, 'tabulator'::app_role, 'admin'::app_role, 'organizer'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['witness'::app_role, 'tabulator'::app_role, 'admin'::app_role, 'organizer'::app_role]));
