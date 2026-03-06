
CREATE TABLE public.competition_infractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'penalty',
  title text NOT NULL,
  description text,
  penalty_points numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.competition_infractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and organizers can manage infractions"
  ON public.competition_infractions FOR ALL
  TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]));

CREATE POLICY "Anyone can view infractions"
  ON public.competition_infractions FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_competition_infractions_updated_at
  BEFORE UPDATE ON public.competition_infractions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
