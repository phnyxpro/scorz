
-- 1. Fix privilege escalation: remove organizer from self-assignable roles
DROP POLICY "Users can self-assign allowed roles" ON public.user_roles;
CREATE POLICY "Users can self-assign allowed roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role IN ('contestant'::app_role, 'audience'::app_role));

-- 2. Harden staff_invitations: restrict SELECT to own invitations or admin/organizer
DROP POLICY "Staff can view own invitations" ON public.staff_invitations;
CREATE POLICY "Users can view own invitations" ON public.staff_invitations
  FOR SELECT TO authenticated
  USING (
    lower(email) = lower(auth.email())
    OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role])
  );

-- 3. Harden notifications: restrict INSERT to authenticated only (service role bypasses RLS)
DROP POLICY "Service can insert notifications" ON public.notifications;
CREATE POLICY "Service can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 4. Harden activity_log: restrict INSERT to authenticated only
DROP POLICY "Service can insert activity logs" ON public.activity_log;
CREATE POLICY "Service can insert activity logs" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 5. Harden competition_credits: restrict public INSERT, keep only admin + service_role
DROP POLICY "Service can insert credits" ON public.competition_credits;
CREATE POLICY "Service can insert credits" ON public.competition_credits
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6. Harden staff_invitation_sub_events: restrict SELECT to own invitations or admin/organizer
DROP POLICY "Staff can view own invitation sub events" ON public.staff_invitation_sub_events;
CREATE POLICY "Users can view own invitation sub events" ON public.staff_invitation_sub_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_invitations si
      WHERE si.id = staff_invitation_id
        AND (lower(si.email) = lower(auth.email())
             OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]))
    )
  );

-- 7. Harden platform_settings: restrict SELECT to authenticated
DROP POLICY "Anyone can view settings" ON public.platform_settings;
CREATE POLICY "Authenticated can view settings" ON public.platform_settings
  FOR SELECT TO authenticated
  USING (true);
