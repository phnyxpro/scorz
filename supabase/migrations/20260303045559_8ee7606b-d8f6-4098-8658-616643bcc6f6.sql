
-- Fix overly permissive event_tickets INSERT policy
DROP POLICY "Anyone can register for tickets" ON public.event_tickets;
CREATE POLICY "Authenticated users can register for tickets"
  ON public.event_tickets FOR INSERT TO authenticated
  WITH CHECK (true);
