import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { JudgeScore } from "@/hooks/useJudgeScores";

export interface JudgingOverviewData {
  levels: any[];
  subEvents: any[];
  assignments: any[];
  profiles: any[];
  registrations: any[];
  scores: JudgeScore[];
  rubric: any[];
}

const EMPTY: JudgingOverviewData = {
  levels: [], subEvents: [], assignments: [], profiles: [],
  registrations: [], scores: [] as JudgeScore[], rubric: [],
};

/**
 * Fetches levels, sub-events, assignments, registrations, scores, profiles,
 * and rubric for a competition — parallelised where possible.
 *
 * Dependency chain:
 *   1. levels + rubric            (parallel)
 *   2. subEvents                  (needs levelIds)
 *   3. assignments + registrations + scores  (parallel, need subEventIds)
 *   4. profiles                   (needs assignment userIds)
 */
export function useJudgingOverview(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["judging_overview", competitionId],
    enabled: !!competitionId,
    queryFn: async (): Promise<JudgingOverviewData> => {
      // ── Wave 1: levels + rubric (parallel) ──
      const [levelsRes, rubricRes] = await Promise.all([
        supabase
          .from("competition_levels")
          .select("*")
          .eq("competition_id", competitionId!)
          .order("sort_order"),
        supabase
          .from("rubric_criteria")
          .select("*")
          .eq("competition_id", competitionId!)
          .order("sort_order"),
      ]);
      if (levelsRes.error) throw levelsRes.error;
      if (rubricRes.error) throw rubricRes.error;

      const levels = levelsRes.data || [];
      const rubric = rubricRes.data || [];
      const levelIds = levels.map((l) => l.id);
      if (!levelIds.length) return { ...EMPTY, rubric };

      // ── Wave 2: subEvents (needs levelIds) ──
      const { data: subEvents, error: se } = await supabase
        .from("sub_events")
        .select("*")
        .in("level_id", levelIds)
        .order("event_date");
      if (se) throw se;

      const subEventIds = (subEvents || []).map((s) => s.id);
      if (!subEventIds.length) return { levels, subEvents: [], assignments: [], profiles: [], registrations: [], scores: [] as JudgeScore[], rubric };

      // ── Wave 3: assignments + registrations + scores (parallel) ──
      const [assignRes, regRes, scoresRes] = await Promise.all([
        supabase
          .from("sub_event_assignments")
          .select("*")
          .in("sub_event_id", subEventIds)
          .eq("role", "judge" as any),
        supabase
          .from("contestant_registrations")
          .select("id, full_name, sub_event_id, status, competition_id, user_id, sort_order")
          .eq("competition_id", competitionId!)
          .neq("status", "rejected")
          .order("sort_order", { ascending: true }),
        supabase
          .from("judge_scores")
          .select("*")
          .in("sub_event_id", subEventIds)
          .limit(5000),
      ]);
      if (assignRes.error) throw assignRes.error;
      if (regRes.error) throw regRes.error;
      if (scoresRes.error) throw scoresRes.error;

      const assignments = assignRes.data || [];
      const registrations = regRes.data || [];
      const scores = (scoresRes.data || []) as JudgeScore[];

      // ── Wave 4: profiles (needs assignment userIds) ──
      const userIds = [...new Set(assignments.map((a: any) => a.user_id))];
      const { data: profiles, error: pe } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds)
        : { data: [] as any[], error: null };
      if (pe) throw pe;

      return {
        levels,
        subEvents: subEvents || [],
        assignments,
        profiles: profiles || [],
        registrations,
        scores,
        rubric,
      };
    },
  });
}
