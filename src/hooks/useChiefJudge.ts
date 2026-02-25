import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { JudgeScore } from "@/hooks/useJudgeScores";

export interface ChiefJudgeCertification {
  id: string;
  sub_event_id: string;
  chief_judge_id: string;
  tie_break_criterion_id: string | null;
  tie_break_notes: string | null;
  penalty_adjustments: Record<string, number>;
  chief_judge_signature: string | null;
  signed_at: string | null;
  is_certified: boolean;
  created_at: string;
  updated_at: string;
}

/** All judge scores for a sub-event (chief_judge / admin only) */
export function useAllScoresForSubEvent(subEventId: string | undefined) {
  return useQuery({
    queryKey: ["all_scores", subEventId],
    enabled: !!subEventId,
    refetchInterval: 10_000, // real-time polling every 10s
    queryFn: async () => {
      const { data, error } = await supabase
        .from("judge_scores")
        .select("*")
        .eq("sub_event_id", subEventId!)
        .order("created_at");
      if (error) throw error;
      return data as JudgeScore[];
    },
  });
}

export function useCertification(subEventId: string | undefined) {
  return useQuery({
    queryKey: ["certification", subEventId],
    enabled: !!subEventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chief_judge_certifications")
        .select("*")
        .eq("sub_event_id", subEventId!)
        .maybeSingle();
      if (error) throw error;
      return data as ChiefJudgeCertification | null;
    },
  });
}

export function useUpsertCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<ChiefJudgeCertification> & { sub_event_id: string; chief_judge_id: string }) => {
      if (values.id) {
        const { error } = await supabase
          .from("chief_judge_certifications")
          .update(values)
          .eq("id", values.id);
        if (error) throw error;
        return values;
      } else {
        const { data, error } = await supabase
          .from("chief_judge_certifications")
          .insert(values)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["certification", v.sub_event_id] });
      toast({ title: "Certification saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useCertifySubEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, chief_judge_signature, sub_event_id }: { id: string; chief_judge_signature: string; sub_event_id: string }) => {
      const { error } = await supabase
        .from("chief_judge_certifications")
        .update({
          chief_judge_signature,
          signed_at: new Date().toISOString(),
          is_certified: true,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["certification", v.sub_event_id] });
      qc.invalidateQueries({ queryKey: ["all_scores", v.sub_event_id] });
      toast({ title: "Sub-event certified!" });
    },
    onError: (e: any) => toast({ title: "Error certifying", description: e.message, variant: "destructive" }),
  });
}

/** Update a judge's penalty (admin override) */
export function useAdjustPenalty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ scoreId, newPenalty, subEventId }: { scoreId: string; newPenalty: number; subEventId: string }) => {
      // Get existing score to recalc final
      const { data: score, error: fetchErr } = await supabase
        .from("judge_scores")
        .select("raw_total")
        .eq("id", scoreId)
        .single();
      if (fetchErr) throw fetchErr;

      const finalScore = Math.max(0, (score as any).raw_total - newPenalty);
      const { error } = await supabase
        .from("judge_scores")
        .update({ time_penalty: newPenalty, final_score: finalScore })
        .eq("id", scoreId);
      if (error) throw error;
      return subEventId;
    },
    onSuccess: (subEventId) => {
      qc.invalidateQueries({ queryKey: ["all_scores", subEventId] });
      toast({ title: "Penalty adjusted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
