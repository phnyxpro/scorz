
-- Allow public access to competitions (already has some, but let's ensure active ones are visible to all)
-- The existing policy "Authenticated users can view active competitions" is TO authenticated.
-- We need one for public as well.

DROP POLICY IF EXISTS "Public can view active competitions" ON public.competitions;
CREATE POLICY "Public can view active competitions" 
  ON public.competitions FOR SELECT 
  USING (status IN ('active', 'completed'));

-- Allow public access to competition levels
DROP POLICY IF EXISTS "Public can view levels" ON public.competition_levels;
CREATE POLICY "Public can view levels" 
  ON public.competition_levels FOR SELECT 
  USING (true);

-- Allow public access to sub-events
DROP POLICY IF EXISTS "Public can view sub_events" ON public.sub_events;
CREATE POLICY "Public can view sub_events" 
  ON public.sub_events FOR SELECT 
  USING (true);

-- Allow public access to rubric criteria
DROP POLICY IF EXISTS "Public can view rubric_criteria" ON public.rubric_criteria;
CREATE POLICY "Public can view rubric_criteria" 
  ON public.rubric_criteria FOR SELECT 
  USING (true);

-- Allow public access to penalty rules
DROP POLICY IF EXISTS "Public can view penalty_rules" ON public.penalty_rules;
CREATE POLICY "Public can view penalty_rules" 
  ON public.penalty_rules FOR SELECT 
  USING (true);

-- Allow public access to contestants registrations (for viewing public profiles)
DROP POLICY IF EXISTS "Public can view approved contestants" ON public.contestant_registrations;
CREATE POLICY "Public can view approved contestants" 
  ON public.contestant_registrations FOR SELECT 
  USING (status = 'approved');

-- Allow public access to sponsors
DROP POLICY IF EXISTS "Public can view sponsors" ON public.competition_sponsors;
CREATE POLICY "Public can view sponsors" 
  ON public.competition_sponsors FOR SELECT 
  USING (true);

-- Allow public access to updates
DROP POLICY IF EXISTS "Public can view updates" ON public.competition_updates;
CREATE POLICY "Public can view updates" 
  ON public.competition_updates FOR SELECT 
  USING (true);
