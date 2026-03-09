import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { calculateMethodScore } from "@/lib/scoring-methods";

/**
 * Check if a level is "complete" — all sub-events have chief judge certifications with is_certified = true
 */
export function useLevelCompletion(levelId: string | null | undefined) {
  return useQuery({
    queryKey: ["level_completion", levelId],
    enabled: !!levelId,
    queryFn: async () => {
      const { data: subEvents } = await supabase
        .from("sub_events")
        .select("id")
        .eq("level_id", levelId!);

      if (!subEvents?.length) return { isComplete: false, totalSubEvents: 0, certifiedSubEvents: 0 };

      const subEventIds = subEvents.map((se) => se.id);
      const { data: certs } = await supabase
        .from("chief_judge_certifications")
        .select("sub_event_id, is_certified")
        .in("sub_event_id", subEventIds)
        .eq("is_certified", true);

      const certifiedIds = new Set((certs || []).map((c) => c.sub_event_id));
      return {
        isComplete: subEventIds.every((id) => certifiedIds.has(id)),
        totalSubEvents: subEventIds.length,
        certifiedSubEvents: certifiedIds.size,
      };
    },
  });
}

/**
 * Get the next level in sort order for a given competition + current level
 */
export function useNextLevel(competitionId: string | undefined, currentLevelSortOrder: number | undefined) {
  return useQuery({
    queryKey: ["next_level", competitionId, currentLevelSortOrder],
    enabled: !!competitionId && currentLevelSortOrder != null,
    queryFn: async () => {
      const { data } = await supabase
        .from("competition_levels")
        .select("id, name, sort_order")
        .eq("competition_id", competitionId!)
        .gt("sort_order", currentLevelSortOrder!)
        .order("sort_order")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
}

/**
 * Promote advancing contestants from a completed level to the next level's first sub-event
 */
export function usePromoteContestants() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      competitionId,
      currentLevelId,
      nextLevelId,
      advancementCount,
      scoringMethod,
    }: {
      competitionId: string;
      currentLevelId: string;
      nextLevelId: string;
      advancementCount: number;
      scoringMethod: string;
    }) => {
      // Get all sub-events in current level
      const { data: subEvents } = await supabase
        .from("sub_events")
        .select("id")
        .eq("level_id", currentLevelId);
      const subEventIds = (subEvents || []).map((se) => se.id);
      if (!subEventIds.length) throw new Error("No sub-events in current level");

      // Get registrations
      const { data: regs } = await supabase
        .from("contestant_registrations")
        .select("id, full_name, user_id, email, age_category, sub_event_id, special_entry_type, location, phone, bio, social_handles, profile_photo_url, performance_video_url")
        .eq("competition_id", competitionId)
        .in("sub_event_id", subEventIds)
        .eq("status", "approved");

      // Get scores
      const { data: scores } = await supabase
        .from("judge_scores")
        .select("*")
        .in("sub_event_id", subEventIds);

      // Rank contestants
      const ranked = (regs || [])
        .map((reg) => {
          const regScores = (scores || []).filter((s) => s.contestant_registration_id === reg.id);
          const certified = regScores.filter((s) => s.is_certified);
          const rawTotals = certified.map((s) => s.raw_total);
          const timePenalty = certified.length > 0 ? Math.max(...certified.map((s) => s.time_penalty)) : 0;
          const allJudgesTotal = rawTotals.reduce((a, b) => a + b, 0);
          const finalScore = certified.length > 0 ? calculateMethodScore(scoringMethod, rawTotals, timePenalty) : 0;
          return { ...reg, finalScore, allJudgesTotal };
        })
        .sort((a, b) => b.finalScore - a.finalScore || b.allJudgesTotal - a.allJudgesTotal);

      const advancing = ranked.slice(0, advancementCount);
      if (!advancing.length) throw new Error("No contestants to promote");

      // Get first sub-event in next level
      const { data: nextSubEvents } = await supabase
        .from("sub_events")
        .select("id")
        .eq("level_id", nextLevelId)
        .order("event_date")
        .limit(1);

      if (!nextSubEvents?.length) throw new Error("No sub-events in next level. Create one first.");
      const nextSubEventId = nextSubEvents[0].id;

      // Check for existing registrations to avoid duplicates
      const { data: existingRegs } = await supabase
        .from("contestant_registrations")
        .select("user_id")
        .eq("competition_id", competitionId)
        .eq("sub_event_id", nextSubEventId);
      const existingUserIds = new Set((existingRegs || []).map((r) => r.user_id));

      // Insert new registrations for advancing contestants
      const newRegs = advancing
        .filter((r) => !existingUserIds.has(r.user_id))
        .map((r, i) => ({
          user_id: r.user_id,
          competition_id: competitionId,
          sub_event_id: nextSubEventId,
          full_name: r.full_name,
          email: r.email,
          age_category: r.age_category,
          status: "approved" as const,
          sort_order: i,
          location: r.location,
          phone: r.phone,
          bio: r.bio,
          social_handles: r.social_handles,
          profile_photo_url: r.profile_photo_url,
          performance_video_url: r.performance_video_url,
        }));

      if (newRegs.length > 0) {
        const { error } = await supabase.from("contestant_registrations").insert(newRegs);
        if (error) throw error;
      }

      return { promoted: newRegs.length, skipped: advancing.length - newRegs.length };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["registrations"] });
      qc.invalidateQueries({ queryKey: ["level_master_sheet"] });
      toast({
        title: "Contestants Promoted",
        description: `${result.promoted} contestant${result.promoted !== 1 ? "s" : ""} advanced to the next level.${result.skipped > 0 ? ` ${result.skipped} already registered.` : ""}`,
      });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
