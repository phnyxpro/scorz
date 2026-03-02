
CREATE POLICY "Public can view levels"
  ON public.competition_levels FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can view sub_events"
  ON public.sub_events FOR SELECT
  TO anon
  USING (true);
