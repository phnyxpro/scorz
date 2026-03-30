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

      // Check all three certification types in parallel
      const [chiefRes, tabRes, witnessRes] = await Promise.all([
        supabase
          .from("chief_judge_certifications")
          .select("sub_event_id")
          .in("sub_event_id", subEventIds)
          .eq("is_certified", true),
        supabase
          .from("tabulator_certifications")
          .select("sub_event_id")
          .in("sub_event_id", subEventIds)
          .eq("is_certified", true),
        supabase
          .from("witness_certifications")
          .select("sub_event_id")
          .in("sub_event_id", subEventIds)
          .eq("is_certified", true),
      ]);

      const chiefIds = new Set((chiefRes.data || []).map((c) => c.sub_event_id));
      const tabIds = new Set((tabRes.data || []).map((c) => c.sub_event_id));
      const witnessIds = new Set((witnessRes.data || []).map((c) => c.sub_event_id));

      // A sub-event is fully certified only when all three roles have certified
      const fullyCertifiedCount = subEventIds.filter(
        (id) => chiefIds.has(id) && tabIds.has(id) && witnessIds.has(id)
      ).length;

      return {
        isComplete: fullyCertifiedCount === subEventIds.length,
        totalSubEvents: subEventIds.length,
        certifiedSubEvents: fullyCertifiedCount,
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
 * Check if promotion has already been completed for a level
 * (i.e. advancing contestants already exist in the next level's first sub-event)
 */
export function usePromotionCompleted(
  competitionId: string | undefined,
  currentLevelId: string | null | undefined,
  nextLevelId: string | null | undefined,
  advancementCount: number | null | undefined,
) {
  return useQuery({
    queryKey: ["promotion_completed", competitionId, currentLevelId, nextLevelId],
    enabled: !!competitionId && !!currentLevelId && !!nextLevelId && advancementCount != null && advancementCount > 0,
    queryFn: async () => {
      // Get first sub-event of next level
      const { data: nextSubEvents } = await supabase
        .from("sub_events")
        .select("id")
        .eq("level_id", nextLevelId!)
        .order("event_date")
        .limit(1);
      if (!nextSubEvents?.length) return false;

      // Check if any approved registrations exist in that sub-event
      const { count } = await supabase
        .from("contestant_registrations")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", competitionId!)
        .eq("sub_event_id", nextSubEvents[0].id)
        .eq("status", "approved");

      return (count ?? 0) > 0;
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

      // Check which contestants already have a registration in the target sub-event
      const { data: existingRegs } = await supabase
        .from("contestant_registrations")
        .select("email")
        .eq("competition_id", competitionId)
        .eq("sub_event_id", nextSubEventId);
      const existingEmails = new Set((existingRegs || []).map((r) => r.email));

      // Insert new registrations for advancing contestants (copy, don't move)
      let promoted = 0;
      let skipped = 0;
      for (let i = 0; i < advancing.length; i++) {
        const reg = advancing[i];
        if (existingEmails.has(reg.email)) {
          skipped++;
          continue;
        }
        const { error } = await supabase
          .from("contestant_registrations")
          .insert({
            user_id: reg.user_id,
            competition_id: competitionId,
            sub_event_id: nextSubEventId,
            full_name: reg.full_name,
            email: reg.email,
            age_category: reg.age_category,
            special_entry_type: reg.special_entry_type,
            location: reg.location,
            phone: reg.phone,
            bio: reg.bio,
            social_handles: reg.social_handles as any,
            profile_photo_url: reg.profile_photo_url,
            performance_video_url: reg.performance_video_url,
            status: "approved",
            sort_order: i,
          });
        if (error) throw error;
        promoted++;
      }

      return { promoted, skipped };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["registrations"] });
      qc.invalidateQueries({ queryKey: ["level_master_sheet"] });
      qc.invalidateQueries({ queryKey: ["promotion_completed"] });
      toast({
        title: "Contestants Promoted",
        description: `${result.promoted} contestant${result.promoted !== 1 ? "s" : ""} advanced to the next level.${result.skipped > 0 ? ` ${result.skipped} already registered.` : ""}`,
      });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
