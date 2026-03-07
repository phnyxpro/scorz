import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

/** Subscribe to realtime changes on judge_scores for a sub-event and auto-invalidate queries */
export function useJudgeScoresRealtime(subEventId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!subEventId) return;
    const channel = supabase
      .channel(`judge_scores_${subEventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "judge_scores", filter: `sub_event_id=eq.${subEventId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["my_scores", subEventId] });
          qc.invalidateQueries({ queryKey: ["my_score", subEventId] });
          qc.invalidateQueries({ queryKey: ["all_scores", subEventId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [subEventId, qc]);
}

export interface JudgeScore {
  id: string;
  sub_event_id: string;
  judge_id: string;
  contestant_registration_id: string;
  criterion_scores: Record<string, number>;
  raw_total: number;
  performance_duration_seconds: number | null;
  time_penalty: number;
  final_score: number;
  comments: string | null;
  judge_signature: string | null;
  signed_at: string | null;
  is_certified: boolean;
  created_at: string;
  updated_at: string;
}

export function useMyScores(subEventId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_scores", subEventId, user?.id],
    enabled: !!subEventId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("judge_scores")
        .select("*")
        .eq("sub_event_id", subEventId!)
        .eq("judge_id", user!.id)
        .order("created_at");
      if (error) throw error;
      return data as JudgeScore[];
    },
  });
}

export function useMyScoreForContestant(subEventId: string | undefined, contestantRegId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_score", subEventId, contestantRegId, user?.id],
    enabled: !!subEventId && !!contestantRegId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("judge_scores")
        .select("*")
        .eq("sub_event_id", subEventId!)
        .eq("judge_id", user!.id)
        .eq("contestant_registration_id", contestantRegId!)
        .maybeSingle();
      if (error) throw error;
      return data as JudgeScore | null;
    },
  });
}

export function useUpsertScore() {
  const qc = useQueryClient();
  const hasFiredScoringStarted = useRef<Set<string>>(new Set());
  return useMutation({
    mutationFn: async (values: Partial<JudgeScore> & { sub_event_id: string; judge_id: string; contestant_registration_id: string }) => {
      if (values.id) {
        const { error } = await supabase
          .from("judge_scores")
          .update(values)
          .eq("id", values.id);
        if (error) throw error;
        return values;
      } else {
        const { data, error } = await supabase
          .from("judge_scores")
          .insert(values)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onMutate: async (newScore) => {
      await qc.cancelQueries({ queryKey: ["my_score", newScore.sub_event_id, newScore.contestant_registration_id] });
      await qc.cancelQueries({ queryKey: ["my_scores", newScore.sub_event_id] });
      const previousScore = qc.getQueryData(["my_score", newScore.sub_event_id, newScore.contestant_registration_id]);
      qc.setQueryData(
        ["my_score", newScore.sub_event_id, newScore.contestant_registration_id],
        (old: any) => ({ ...old, ...newScore })
      );
      return { previousScore };
    },
    onError: (err: any, newScore, context) => {
      if (context?.previousScore) {
        qc.setQueryData(
          ["my_score", newScore.sub_event_id, newScore.contestant_registration_id],
          context.previousScore
        );
      }
      toast({ title: "Error saving score", description: err.message, variant: "destructive" });
    },
    onSettled: (data, error, variables) => {
      qc.invalidateQueries({ queryKey: ["my_scores", variables.sub_event_id] });
      qc.invalidateQueries({ queryKey: ["my_score", variables.sub_event_id, variables.contestant_registration_id] });
      qc.invalidateQueries({ queryKey: ["all_scores", variables.sub_event_id] });

      // Fire scoring_started once per sub-event (only on first insert, not update)
      if (!error && !variables.id && !hasFiredScoringStarted.current.has(variables.sub_event_id)) {
        hasFiredScoringStarted.current.add(variables.sub_event_id);
        supabase.functions.invoke("notify-scoring-events", {
          body: { type: "scoring_started", sub_event_id: variables.sub_event_id },
        }).catch(() => {});
      }
    },
  });
}

export function useCertifyScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, judge_signature, sub_event_id, contestant_registration_id }: { id: string; judge_signature: string; sub_event_id: string; contestant_registration_id: string }) => {
      const { error } = await supabase
        .from("judge_scores")
        .update({
          judge_signature,
          signed_at: new Date().toISOString(),
          is_certified: true,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["my_scores", v.sub_event_id] });
      qc.invalidateQueries({ queryKey: ["my_score", v.sub_event_id, v.contestant_registration_id] });
      toast({ title: "Score certified and locked" });

      // Notify scoring events — judge certified
      supabase.functions.invoke("notify-scoring-events", {
        body: { type: "judge_certified", sub_event_id: v.sub_event_id },
      }).catch(() => {});
    },
    onError: (e: any) => toast({ title: "Error certifying", description: e.message, variant: "destructive" }),
  });
}
