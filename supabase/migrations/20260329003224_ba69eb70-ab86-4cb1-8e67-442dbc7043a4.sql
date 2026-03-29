
-- 1. Fix SECURITY DEFINER views by recreating as SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS SELECT user_id, full_name, avatar_url FROM profiles;

DROP VIEW IF EXISTS public.public_contestants;
CREATE VIEW public.public_contestants
WITH (security_invoker = true)
AS SELECT id, full_name, bio, profile_photo_url, age_category, location,
  social_handles, competition_id, sub_event_id, sort_order, performance_video_url,
  user_id, status
FROM contestant_registrations WHERE status = 'approved'::text;

-- Grant access on the views
GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT SELECT ON public.public_contestants TO anon, authenticated;

-- 2. Fix push_subscriptions: Remove open INSERT policy
DROP POLICY IF EXISTS "Service can insert subscriptions" ON public.push_subscriptions;
