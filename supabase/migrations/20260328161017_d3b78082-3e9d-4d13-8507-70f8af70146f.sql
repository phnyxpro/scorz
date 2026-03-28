
-- Add structure_type to competition_levels
ALTER TABLE public.competition_levels
ADD COLUMN structure_type text NOT NULL DEFAULT 'sub_events';

-- Create competition_categories table
CREATE TABLE public.competition_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id uuid NOT NULL REFERENCES public.competition_levels(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.competition_categories(id) ON DELETE CASCADE,
  sub_event_id uuid REFERENCES public.sub_events(id) ON DELETE SET NULL,
  name text NOT NULL,
  color text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.competition_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and organizers can manage categories"
  ON public.competition_categories FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]));

CREATE POLICY "Authenticated users can view categories"
  ON public.competition_categories FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Public can view categories"
  ON public.competition_categories FOR SELECT TO anon
  USING (true);

-- Create special_awards table
CREATE TABLE public.special_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.special_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and organizers can manage special_awards"
  ON public.special_awards FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]));

CREATE POLICY "Authenticated users can view special_awards"
  ON public.special_awards FOR SELECT TO authenticated
  USING (true);

-- Create special_award_votes table
CREATE TABLE public.special_award_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  special_award_id uuid NOT NULL REFERENCES public.special_awards(id) ON DELETE CASCADE,
  judge_id uuid NOT NULL,
  contestant_registration_id uuid NOT NULL REFERENCES public.contestant_registrations(id) ON DELETE CASCADE,
  sub_event_id uuid NOT NULL REFERENCES public.sub_events(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (special_award_id, judge_id)
);

ALTER TABLE public.special_award_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Judges can manage own votes"
  ON public.special_award_votes FOR ALL TO authenticated
  USING (judge_id = auth.uid())
  WITH CHECK (judge_id = auth.uid());

CREATE POLICY "Staff can view all votes"
  ON public.special_award_votes FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role, 'tabulator'::app_role, 'chief_judge'::app_role]));
