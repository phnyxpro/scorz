-- Allow anonymous users to read approved contestant registrations
-- The public_contestants view (security_invoker) already strips PII columns
CREATE POLICY "Anon can view approved registrations"
  ON public.contestant_registrations
  FOR SELECT
  TO anon
  USING (status = 'approved');