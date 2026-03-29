
-- 1. Fix activity_log: Remove open INSERT policy (edge functions use service role key, bypassing RLS)
DROP POLICY IF EXISTS "Service can insert activity logs" ON public.activity_log;

-- 2. Fix notifications: Remove open INSERT policy (edge functions use service role key, bypassing RLS)
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;

-- 3. Fix competition_credits: Remove unrestricted UPDATE policy (credits should be immutable from client)
DROP POLICY IF EXISTS "Users can update own credits" ON public.competition_credits;
