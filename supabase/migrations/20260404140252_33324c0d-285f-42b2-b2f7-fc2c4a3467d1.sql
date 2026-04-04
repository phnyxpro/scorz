-- Remove the anon policy since it exposes PII via direct table access
DROP POLICY IF EXISTS "Anon can view approved registrations" ON public.contestant_registrations;

-- Recreate public_contestants view WITHOUT security_invoker
-- so it runs as the view owner (bypasses RLS) and only exposes safe columns
DROP VIEW IF EXISTS public.public_contestants;

CREATE VIEW public.public_contestants AS
  SELECT id,
    full_name,
    bio,
    profile_photo_url,
    age_category,
    location,
    social_handles,
    competition_id,
    sub_event_id,
    sort_order,
    performance_video_url,
    status
  FROM contestant_registrations
  WHERE status = 'approved';

-- Grant anon and authenticated SELECT on the view
GRANT SELECT ON public.public_contestants TO anon;
GRANT SELECT ON public.public_contestants TO authenticated;