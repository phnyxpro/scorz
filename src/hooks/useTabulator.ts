import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/** Subscribe to realtime changes on tabulator_certifications */
export function useTabulatorCertificationRealtime(subEventId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!subEventId) return;
    const channel = supabase
      .channel(`tab_cert_${subEventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tabulator_certifications", filter: `sub_event_id=eq.${subEventId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["tabulator_certification", subEventId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [subEventId, qc]);
}

export interface TabulatorCertification {
  id: string;
  sub_event_id: string;
  tabulator_id: string;
  digital_vs_physical_match: boolean;
  discrepancy_notes: string | null;
  tabulator_signature: string | null;
  signed_at: string | null;
  is_certified: boolean;
  created_at: string;
  updated_at: string;
}

export function useTabulatorCertification(subEventId: string | undefined) {
  return useQuery({
    queryKey: ["tabulator_certification", subEventId],
    enabled: !!subEventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tabulator_certifications")
        .select("*")
        .eq("sub_event_id", subEventId!)
        .maybeSingle();
      if (error) throw error;
      return data as TabulatorCertification | null;
    },
  });
}

export function useUpsertTabulatorCert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<TabulatorCertification> & { sub_event_id: string; tabulator_id: string }) => {
      if (values.id) {
        const { error } = await supabase
          .from("tabulator_certifications")
          .update(values)
          .eq("id", values.id);
        if (error) throw error;
        return values;
      } else {
        const { data, error } = await supabase
          .from("tabulator_certifications")
          .insert(values)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["tabulator_certification", v.sub_event_id] });
      toast({ title: "Tabulator record saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useCertifyTabulator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tabulator_signature, sub_event_id }: { id: string; tabulator_signature: string; sub_event_id: string }) => {
      const { error } = await supabase
        .from("tabulator_certifications")
        .update({
          tabulator_signature,
          signed_at: new Date().toISOString(),
          is_certified: true,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["tabulator_certification", v.sub_event_id] });
      toast({ title: "Tabulator certification complete" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
