
-- Fix overly permissive INSERT policy - restrict to audience role holders
DROP POLICY "Authenticated users can vote" ON public.audience_votes;

CREATE POLICY "Audience members can vote"
  ON public.audience_votes FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['audience'::app_role, 'contestant'::app_role, 'admin'::app_role, 'organizer'::app_role]));
