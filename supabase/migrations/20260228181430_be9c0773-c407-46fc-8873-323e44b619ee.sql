
-- Add new columns to competitions
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS rules_url text,
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Create competition_sponsors table
CREATE TABLE public.competition_sponsors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text NOT NULL,
  website_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.competition_sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view sponsors"
  ON public.competition_sponsors FOR SELECT USING (true);

CREATE POLICY "Admins and organizers can manage sponsors"
  ON public.competition_sponsors FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]));

CREATE TRIGGER update_competition_sponsors_updated_at
  BEFORE UPDATE ON public.competition_sponsors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create competition_updates table
CREATE TABLE public.competition_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.competition_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view updates"
  ON public.competition_updates FOR SELECT USING (true);

CREATE POLICY "Admins and organizers can manage updates"
  ON public.competition_updates FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]));

CREATE TRIGGER update_competition_updates_updated_at
  BEFORE UPDATE ON public.competition_updates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
