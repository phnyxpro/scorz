
-- Add banner columns to competitions, levels, and sub_events
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE public.competition_levels ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE public.sub_events ADD COLUMN IF NOT EXISTS banner_url text;

-- Add ticketing config to sub_events
ALTER TABLE public.sub_events ADD COLUMN IF NOT EXISTS ticketing_type text NOT NULL DEFAULT 'free';
ALTER TABLE public.sub_events ADD COLUMN IF NOT EXISTS ticket_price numeric DEFAULT 0;
ALTER TABLE public.sub_events ADD COLUMN IF NOT EXISTS max_tickets integer;

-- Create event_tickets table for audience registration/ticketing
CREATE TABLE public.event_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_event_id uuid NOT NULL REFERENCES public.sub_events(id) ON DELETE CASCADE,
  user_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  ticket_number text NOT NULL,
  ticket_type text NOT NULL DEFAULT 'free',
  is_checked_in boolean NOT NULL DEFAULT false,
  checked_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;

-- Anyone can view tickets (for validation)
CREATE POLICY "Admins can manage tickets"
  ON public.event_tickets FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]));

-- Anyone can create a ticket (public registration)
CREATE POLICY "Anyone can register for tickets"
  ON public.event_tickets FOR INSERT
  WITH CHECK (true);

-- Users can view own tickets
CREATE POLICY "Users can view own tickets"
  ON public.event_tickets FOR SELECT
  USING (true);

-- Add a SELECT policy on competitions so public visitors can see active ones
CREATE POLICY "Public can view active competitions"
  ON public.competitions FOR SELECT
  USING (status = 'active');

-- Create storage bucket for banners
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true);

-- Allow authenticated users to upload banners
CREATE POLICY "Authenticated can upload banners"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'banners' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update banners"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'banners' AND auth.role() = 'authenticated');

CREATE POLICY "Public can view banners"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'banners');

-- Updated_at trigger for event_tickets
CREATE TRIGGER update_event_tickets_updated_at
  BEFORE UPDATE ON public.event_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
