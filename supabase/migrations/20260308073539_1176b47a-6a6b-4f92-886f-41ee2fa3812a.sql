
-- Fix notifications: restrict INSERT to authenticated users only (not anon)
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;
CREATE POLICY "Service can insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fix activity_log: restrict INSERT to authenticated users only (not anon)
DROP POLICY IF EXISTS "Service can insert activity logs" ON public.activity_log;
CREATE POLICY "Service can insert activity logs"
  ON public.activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fix platform_settings: restrict SELECT to authenticated only (not anon)
DROP POLICY IF EXISTS "Authenticated can view settings" ON public.platform_settings;
CREATE POLICY "Authenticated can view settings"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (true);
