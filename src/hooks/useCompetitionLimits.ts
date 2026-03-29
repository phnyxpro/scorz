import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTierByProductId, type TierLimits } from "@/lib/stripe-tiers";

const DEFAULT_LIMITS: TierLimits = { organizers: 2, judges: 7, tabulators: 2 };

export function useCompetitionLimits(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["competition-limits", competitionId],
    enabled: !!competitionId,
    queryFn: async (): Promise<TierLimits> => {
      const { data } = await supabase
        .from("competition_credits")
        .select("tier_product_id")
        .eq("competition_id", competitionId!)
        .maybeSingle();

      if (!data?.tier_product_id) return DEFAULT_LIMITS;
      const tier = getTierByProductId(data.tier_product_id);
      return tier?.limits ?? DEFAULT_LIMITS;
    },
  });
}

/** Count all staff assigned to a competition across all sub-events, grouped by role */
export function useCompetitionStaffCounts(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["competition-staff-counts", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      // Get all level IDs for the competition
      const { data: levels } = await supabase
        .from("competition_levels")
        .select("id")
        .eq("competition_id", competitionId!);

      if (!levels?.length) return { organizers: 0, judges: 0, tabulators: 0 };

      // Get all sub-events for those levels
      const { data: subEvents } = await supabase
        .from("sub_events")
        .select("id")
        .in("level_id", levels.map((l) => l.id));

      if (!subEvents?.length) return { organizers: 0, judges: 0, tabulators: 0 };

      // Get all assignments across those sub-events
      const { data: assignments } = await supabase
        .from("sub_event_assignments")
        .select("user_id, role")
        .in("sub_event_id", subEvents.map((se) => se.id));

      if (!assignments?.length) return { organizers: 0, judges: 0, tabulators: 0 };

      // Count unique users per role
      const uniqueByRole = (role: string) => {
        const users = new Set(assignments.filter((a) => a.role === role).map((a) => a.user_id));
        return users.size;
      };

      return {
        organizers: uniqueByRole("organizer"),
        judges: uniqueByRole("judge"),
        tabulators: uniqueByRole("tabulator"),
      };
    },
  });
}
