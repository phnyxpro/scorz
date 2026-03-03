
-- Public can view approved contestant registrations (names, photos, locations on public page)
CREATE POLICY "Public can view approved contestants"
ON public.contestant_registrations
FOR SELECT
USING (status = 'approved');

-- Public can view sub_event_assignments (to show judges on public page)
CREATE POLICY "Public can view assignments"
ON public.sub_event_assignments
FOR SELECT
USING (true);

-- Public can view profiles (needed to show judge names/avatars)
CREATE POLICY "Public can view profiles"
ON public.profiles
FOR SELECT
USING (true);
