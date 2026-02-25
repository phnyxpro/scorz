
-- Competitions table
CREATE TABLE public.competitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed','archived')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and organizers can manage competitions"
  ON public.competitions FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','organizer']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','organizer']::app_role[]));

CREATE POLICY "Authenticated users can view active competitions"
  ON public.competitions FOR SELECT TO authenticated
  USING (status IN ('active','completed'));

CREATE TRIGGER update_competitions_updated_at
  BEFORE UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Competition Levels (Stages)
CREATE TABLE public.competition_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.competition_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and organizers can manage levels"
  ON public.competition_levels FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','organizer']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','organizer']::app_role[]));

CREATE POLICY "Authenticated users can view levels"
  ON public.competition_levels FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_competition_levels_updated_at
  BEFORE UPDATE ON public.competition_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sub-Events
CREATE TABLE public.sub_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_id UUID NOT NULL REFERENCES public.competition_levels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  event_date DATE,
  start_time TIME,
  end_time TIME,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sub_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and organizers can manage sub_events"
  ON public.sub_events FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','organizer']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','organizer']::app_role[]));

CREATE POLICY "Authenticated users can view sub_events"
  ON public.sub_events FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_sub_events_updated_at
  BEFORE UPDATE ON public.sub_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Rubric Criteria
CREATE TABLE public.rubric_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  description_1 TEXT NOT NULL DEFAULT 'Very Weak',
  description_2 TEXT NOT NULL DEFAULT 'Weak',
  description_3 TEXT NOT NULL DEFAULT 'Average',
  description_4 TEXT NOT NULL DEFAULT 'Strong',
  description_5 TEXT NOT NULL DEFAULT 'Excellent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and organizers can manage rubric_criteria"
  ON public.rubric_criteria FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','organizer']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','organizer']::app_role[]));

CREATE POLICY "Authenticated users can view rubric_criteria"
  ON public.rubric_criteria FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_rubric_criteria_updated_at
  BEFORE UPDATE ON public.rubric_criteria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Penalty Rules
CREATE TABLE public.penalty_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  time_limit_seconds INT NOT NULL DEFAULT 240,
  grace_period_seconds INT NOT NULL DEFAULT 15,
  sort_order INT NOT NULL DEFAULT 0,
  from_seconds INT NOT NULL,
  to_seconds INT,
  penalty_points NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.penalty_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and organizers can manage penalty_rules"
  ON public.penalty_rules FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','organizer']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','organizer']::app_role[]));

CREATE POLICY "Authenticated users can view penalty_rules"
  ON public.penalty_rules FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_penalty_rules_updated_at
  BEFORE UPDATE ON public.penalty_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
