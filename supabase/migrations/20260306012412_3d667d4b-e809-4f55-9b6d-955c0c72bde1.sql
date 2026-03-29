DROP POLICY IF EXISTS "Users can self-assign contestant or audience role" ON public.user_roles;
CREATE POLICY "Users can self-assign allowed roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = ANY(ARRAY['contestant'::app_role, 'audience'::app_role, 'organizer'::app_role])
  );