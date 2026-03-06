
-- Activity log table for tracking certification events and notifications
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid REFERENCES public.competitions(id) ON DELETE CASCADE,
  sub_event_id uuid REFERENCES public.sub_events(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'scores_certified', 'chief_certified', 'tabulator_certified', 'witness_certified', 'notification_sent'
  title text NOT NULL,
  description text,
  actor_id uuid, -- user who triggered it, nullable for system events
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Only admins/organizers can view activity logs
CREATE POLICY "Admins and organizers can view activity logs"
  ON public.activity_log FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]));

-- System can insert (via service role from edge functions / triggers)
CREATE POLICY "Service can insert activity logs"
  ON public.activity_log FOR INSERT
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_activity_log_competition ON public.activity_log(competition_id, created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
