
-- =============================================
-- P0: Fix 4 critical RLS policy errors
-- =============================================

-- 1A. PROFILES: Drop overly permissive public SELECT policies
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone authenticated can view profiles" ON public.profiles;

-- 1A. PROFILES: Add scoped policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all profiles" ON public.profiles
  FOR SELECT USING (
    has_any_role(auth.uid(), ARRAY['admin','organizer','chief_judge','judge','tabulator','witness']::app_role[])
  );

-- 1A. PROFILES: Create a safe public view (name + avatar only, bypasses RLS via postgres owner)
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT user_id, full_name, avatar_url FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 1B. CONTESTANT REGISTRATIONS: Drop overly permissive public SELECT
DROP POLICY IF EXISTS "Public can view approved contestants" ON public.contestant_registrations;

-- 1B. Create safe public view (no PII: no email, phone, guardian info, signatures)
CREATE OR REPLACE VIEW public.public_contestants AS
  SELECT id, full_name, bio, profile_photo_url, age_category, location,
         social_handles, competition_id, sub_event_id, sort_order,
         performance_video_url, user_id, status
  FROM public.contestant_registrations
  WHERE status = 'approved';

GRANT SELECT ON public.public_contestants TO anon, authenticated;

-- 1C. EVENT TICKETS: Fix SELECT from USING(true) to scoped
DROP POLICY IF EXISTS "Users can view own tickets" ON public.event_tickets;

CREATE POLICY "Users can view own tickets" ON public.event_tickets
  FOR SELECT USING (
    auth.uid() = user_id
    OR has_any_role(auth.uid(), ARRAY['admin','organizer']::app_role[])
  );

-- 1C. EVENT TICKETS: Fix INSERT to scope user_id
DROP POLICY IF EXISTS "Authenticated users can register for tickets" ON public.event_tickets;

CREATE POLICY "Users can register for tickets" ON public.event_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 1D. AUDIENCE VOTES: Fix SELECT from USING(true) to role-scoped
DROP POLICY IF EXISTS "Users can view vote counts" ON public.audience_votes;

CREATE POLICY "Staff can view all votes" ON public.audience_votes
  FOR SELECT USING (
    has_any_role(auth.uid(), ARRAY['admin','organizer']::app_role[])
  );

-- 1D. Create a safe function for aggregated vote counts (no PII exposed)
CREATE OR REPLACE FUNCTION public.get_vote_counts(_sub_event_id uuid)
RETURNS TABLE(contestant_registration_id uuid, vote_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT contestant_registration_id, COUNT(*) as vote_count
  FROM public.audience_votes
  WHERE sub_event_id = _sub_event_id
  GROUP BY contestant_registration_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_vote_counts(uuid) TO anon, authenticated;

-- =============================================
-- P1: Security hardening
-- =============================================

-- 2A. Chief judge certifications: restrict to relevant roles
DROP POLICY IF EXISTS "Authenticated can view certifications" ON public.chief_judge_certifications;

CREATE POLICY "Relevant roles can view certifications" ON public.chief_judge_certifications
  FOR SELECT USING (
    has_any_role(auth.uid(), ARRAY['admin','organizer','chief_judge','judge','tabulator','witness']::app_role[])
    OR is_chief_for_sub_event(auth.uid(), sub_event_id)
  );

-- 2B. Tabulator certifications: restrict to relevant roles
DROP POLICY IF EXISTS "Authenticated can view tabulator certifications" ON public.tabulator_certifications;

CREATE POLICY "Relevant roles can view tabulator certifications" ON public.tabulator_certifications
  FOR SELECT USING (
    has_any_role(auth.uid(), ARRAY['admin','organizer','tabulator','chief_judge','witness']::app_role[])
  );

-- 2C. Witness certifications: restrict to relevant roles
DROP POLICY IF EXISTS "Authenticated can view witness certifications" ON public.witness_certifications;

CREATE POLICY "Relevant roles can view witness certifications" ON public.witness_certifications
  FOR SELECT USING (
    has_any_role(auth.uid(), ARRAY['admin','organizer','witness','chief_judge','tabulator']::app_role[])
  );

-- =============================================
-- P2: Database indexes for FK columns
-- =============================================

CREATE INDEX IF NOT EXISTS idx_judge_scores_sub_contestant ON public.judge_scores(sub_event_id, contestant_registration_id);
CREATE INDEX IF NOT EXISTS idx_judge_scores_judge ON public.judge_scores(judge_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user_sub ON public.sub_event_assignments(user_id, sub_event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_competition_status ON public.contestant_registrations(competition_id, status);
CREATE INDEX IF NOT EXISTS idx_registrations_sub_event_status ON public.contestant_registrations(sub_event_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.event_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_sub_event ON public.event_tickets(sub_event_id);
CREATE INDEX IF NOT EXISTS idx_votes_sub_contestant ON public.audience_votes(sub_event_id, contestant_registration_id);
CREATE INDEX IF NOT EXISTS idx_levels_competition ON public.competition_levels(competition_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_sub_events_level ON public.sub_events(level_id);
CREATE INDEX IF NOT EXISTS idx_slots_sub_event ON public.performance_slots(sub_event_id);
CREATE INDEX IF NOT EXISTS idx_penalty_rules_competition ON public.penalty_rules(competition_id);
CREATE INDEX IF NOT EXISTS idx_rubric_criteria_competition ON public.rubric_criteria(competition_id);

-- =============================================
-- P2: updated_at triggers for all tables
-- =============================================

CREATE OR REPLACE TRIGGER set_updated_at_competitions
  BEFORE UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_competition_levels
  BEFORE UPDATE ON public.competition_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_sub_events
  BEFORE UPDATE ON public.sub_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_contestant_registrations
  BEFORE UPDATE ON public.contestant_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_judge_scores
  BEFORE UPDATE ON public.judge_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_penalty_rules
  BEFORE UPDATE ON public.penalty_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_performance_slots
  BEFORE UPDATE ON public.performance_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_chief_judge_certifications
  BEFORE UPDATE ON public.chief_judge_certifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_tabulator_certifications
  BEFORE UPDATE ON public.tabulator_certifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_witness_certifications
  BEFORE UPDATE ON public.witness_certifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_competition_sponsors
  BEFORE UPDATE ON public.competition_sponsors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_competition_updates
  BEFORE UPDATE ON public.competition_updates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_rubric_criteria
  BEFORE UPDATE ON public.rubric_criteria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_event_tickets
  BEFORE UPDATE ON public.event_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- P3: Score integrity trigger
-- =============================================

CREATE OR REPLACE FUNCTION public.recalculate_final_score()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.final_score := NEW.raw_total - NEW.time_penalty;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER calc_final_score
  BEFORE INSERT OR UPDATE OF raw_total, time_penalty
  ON public.judge_scores
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_final_score();

-- =============================================
-- P3: get_assigned_competitions function (eliminates N+1)
-- =============================================

CREATE OR REPLACE FUNCTION public.get_assigned_competitions(_user_id uuid)
RETURNS TABLE(
  competition_id uuid,
  competition_name text,
  competition_slug text,
  competition_status text,
  competition_banner_url text,
  sub_event_id uuid,
  sub_event_name text,
  level_id uuid,
  level_name text,
  assignment_role app_role,
  is_chief boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    c.id as competition_id,
    c.name as competition_name,
    c.slug as competition_slug,
    c.status as competition_status,
    c.banner_url as competition_banner_url,
    se.id as sub_event_id,
    se.name as sub_event_name,
    cl.id as level_id,
    cl.name as level_name,
    sa.role as assignment_role,
    sa.is_chief
  FROM public.sub_event_assignments sa
  JOIN public.sub_events se ON se.id = sa.sub_event_id
  JOIN public.competition_levels cl ON cl.id = se.level_id
  JOIN public.competitions c ON c.id = cl.competition_id
  WHERE sa.user_id = _user_id
  ORDER BY c.name, cl.sort_order, se.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_assigned_competitions(uuid) TO authenticated;

-- =============================================
-- P4: Compliance - Account deletion
-- =============================================

-- Allow users to delete their own profile
CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = user_id);
