import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface WitnessCertification {
  id: string;
  sub_event_id: string;
  witness_id: string;
  observations: string | null;
  witness_signature: string | null;
  signed_at: string | null;
  is_certified: boolean;
  created_at: string;
  updated_at: string;
}

export function useWitnessCertification(subEventId: string | undefined) {
  return useQuery({
    queryKey: ["witness_certification", subEventId],
    enabled: !!subEventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("witness_certifications")
        .select("*")
        .eq("sub_event_id", subEventId!)
        .maybeSingle();
      if (error) throw error;
      return data as WitnessCertification | null;
    },
  });
}

export function useUpsertWitnessCert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<WitnessCertification> & { sub_event_id: string; witness_id: string }) => {
      if (values.id) {
        const { error } = await supabase
          .from("witness_certifications")
          .update(values)
          .eq("id", values.id);
        if (error) throw error;
        return values;
      } else {
        const { data, error } = await supabase
          .from("witness_certifications")
          .insert(values)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["witness_certification", v.sub_event_id] });
      toast({ title: "Witness record saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useCertifyWitness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, witness_signature, sub_event_id }: { id: string; witness_signature: string; sub_event_id: string }) => {
      const { error } = await supabase
        .from("witness_certifications")
        .update({
          witness_signature,
          signed_at: new Date().toISOString(),
          is_certified: true,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["witness_certification", v.sub_event_id] });
      toast({ title: "Witness certification complete" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
