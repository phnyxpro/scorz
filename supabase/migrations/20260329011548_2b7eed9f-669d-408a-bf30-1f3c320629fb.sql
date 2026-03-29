
-- Remove duplicate public SELECT policies on sub_event_assignments
-- and replace with a single authenticated-only SELECT policy
DROP POLICY IF EXISTS "Authenticated can view assignments" ON public.sub_event_assignments;
DROP POLICY IF EXISTS "Public can view assignments" ON public.sub_event_assignments;

CREATE POLICY "Authenticated can view assignments"
ON public.sub_event_assignments
FOR SELECT
TO authenticated
USING (true);
