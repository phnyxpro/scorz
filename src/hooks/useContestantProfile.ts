import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ContestantRegistration } from "./useRegistrations";
import type { JudgeScore } from "./useJudgeScores";

/** Fetch all registrations for a specific user across competitions */
export function useContestantRegistrations(userId: string | undefined) {
  return useQuery({
    queryKey: ["contestant_registrations", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contestant_registrations")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ContestantRegistration[];
    },
  });
}

/** Fetch competition names by IDs */
export function useCompetitionNames(ids: string[]) {
  return useQuery({
    queryKey: ["competition_names", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("id, name, status")
        .in("id", ids);
      if (error) throw error;
      return data as { id: string; name: string; status: string }[];
    },
  });
}

/** Fetch all scores for a contestant's registrations */
export function useContestantScores(registrationIds: string[]) {
  return useQuery({
    queryKey: ["contestant_scores", registrationIds],
    enabled: registrationIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("judge_scores")
        .select("*")
        .in("contestant_registration_id", registrationIds)
        .order("created_at");
      if (error) throw error;
      return data as JudgeScore[];
    },
  });
}

/** Fetch audience vote counts for a contestant's registrations */
export function useContestantVotes(registrationIds: string[]) {
  return useQuery({
    queryKey: ["contestant_votes", registrationIds],
    enabled: registrationIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audience_votes")
        .select("contestant_registration_id")
        .in("contestant_registration_id", registrationIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const v of data || []) {
        counts[v.contestant_registration_id] = (counts[v.contestant_registration_id] || 0) + 1;
      }
      return counts;
    },
  });
}

/** Fetch sub-event details with level info for context */
export function useSubEventNames(ids: string[]) {
  return useQuery({
    queryKey: ["sub_event_names", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_events")
        .select("id, name, event_date, status, level_id, competition_levels!inner(id, name, sort_order)")
        .in("id", ids);
      if (error) throw error;
      return (data || []).map((s: any) => ({
        id: s.id as string,
        name: s.name as string,
        event_date: s.event_date as string | null,
        status: s.status as string,
        level_id: s.level_id as string,
        level_name: s.competition_levels?.name as string,
        level_sort_order: s.competition_levels?.sort_order as number,
      }));
    },
  });
}
