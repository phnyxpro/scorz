-- Performance indexing for commonly queried foreign keys to improve dashboard loading times

-- Competition structure
CREATE INDEX IF NOT EXISTS idx_competition_levels_competition_id ON public.competition_levels(competition_id);
CREATE INDEX IF NOT EXISTS idx_sub_events_level_id ON public.sub_events(level_id);

-- Scoring configuration
CREATE INDEX IF NOT EXISTS idx_rubric_criteria_competition_id ON public.rubric_criteria(competition_id);
CREATE INDEX IF NOT EXISTS idx_penalty_rules_competition_id ON public.penalty_rules(competition_id);

-- Registrations and Assignments
CREATE INDEX IF NOT EXISTS idx_contestant_registrations_competition_id ON public.contestant_registrations(competition_id);
CREATE INDEX IF NOT EXISTS idx_contestant_registrations_sub_event_id ON public.contestant_registrations(sub_event_id);
CREATE INDEX IF NOT EXISTS idx_sub_event_assignments_sub_event_id ON public.sub_event_assignments(sub_event_id);
CREATE INDEX IF NOT EXISTS idx_sub_event_assignments_user_id ON public.sub_event_assignments(user_id);

-- Scoring Data (Highly active during live events)
CREATE INDEX IF NOT EXISTS idx_judge_scores_sub_event_id ON public.judge_scores(sub_event_id);
CREATE INDEX IF NOT EXISTS idx_judge_scores_judge_id ON public.judge_scores(judge_id);
CREATE INDEX IF NOT EXISTS idx_judge_scores_contestant_registration_id ON public.judge_scores(contestant_registration_id);

-- Certification tracking
CREATE INDEX IF NOT EXISTS idx_sub_event_certifications_sub_event_id ON public.sub_event_certifications(sub_event_id);
