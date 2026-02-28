import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface CompetitionUpdate {
  id: string;
  competition_id: string;
  title: string;
  content: string;
  image_url: string | null;
  published_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useCompetitionUpdates(compId: string | undefined) {
  return useQuery({
    queryKey: ["competition-updates", compId],
    enabled: !!compId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competition_updates" as any)
        .select("*")
        .eq("competition_id", compId!)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as unknown as CompetitionUpdate[];
    },
  });
}

export function useCreateUpdate() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: { competition_id: string; title: string; content: string; image_url?: string }) => {
      const { data, error } = await supabase
        .from("competition_updates" as any)
        .insert({ ...values, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["competition-updates", v.competition_id] });
      toast({ title: "Update posted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, competition_id }: { id: string; competition_id: string }) => {
      const { error } = await supabase.from("competition_updates" as any).delete().eq("id", id);
      if (error) throw error;
      return competition_id;
    },
    onSuccess: (cid) => {
      qc.invalidateQueries({ queryKey: ["competition-updates", cid] });
      toast({ title: "Update deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
