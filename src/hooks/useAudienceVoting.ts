import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface AudienceVote {
  id: string;
  sub_event_id: string;
  contestant_registration_id: string;
  voter_name: string;
  voter_email: string;
  voter_phone: string | null;
  ticket_number: string | null;
  created_at: string;
}

export function useVoteCountsRealtime(subEventId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!subEventId) return;
    const channel = supabase
      .channel(`vote_counts_${subEventId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "audience_votes",
        filter: `sub_event_id=eq.${subEventId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["vote_counts", subEventId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [subEventId, queryClient]);
}

export function useVoteCounts(subEventId: string | undefined) {
  useVoteCountsRealtime(subEventId);
  return useQuery({
    queryKey: ["vote_counts", subEventId],
    enabled: !!subEventId,
    queryFn: async () => {
      // Use safe RPC function that returns aggregated counts only (no PII)
      const { data, error } = await supabase
        .rpc("get_vote_counts", { _sub_event_id: subEventId! });
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const v of (data || []) as any[]) {
        counts[v.contestant_registration_id] = Number(v.vote_count);
      }
      return counts;
    },
  });
}

export function useMyVote(subEventId: string | undefined, voterEmail: string | undefined) {
  return useQuery({
    queryKey: ["my_vote", subEventId, voterEmail],
    enabled: !!subEventId && !!voterEmail,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audience_votes")
        .select("*")
        .eq("sub_event_id", subEventId!)
        .eq("voter_email", voterEmail!)
        .maybeSingle();
      if (error) throw error;
      return data as AudienceVote | null;
    },
  });
}

export function useCastVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      sub_event_id: string;
      contestant_registration_id: string;
      voter_name: string;
      voter_email: string;
      voter_phone?: string;
      ticket_number?: string;
    }) => {
      const { data, error } = await supabase
        .from("audience_votes")
        .insert(values)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("You have already voted for this sub-event.");
        throw error;
      }
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["vote_counts", v.sub_event_id] });
      qc.invalidateQueries({ queryKey: ["my_vote", v.sub_event_id] });
      toast({ title: "Vote cast!", description: "Thank you for voting." });
    },
    onError: (e: any) => toast({ title: "Voting error", description: e.message, variant: "destructive" }),
  });
}
