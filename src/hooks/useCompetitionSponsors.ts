import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CompetitionSponsor {
  id: string;
  competition_id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useCompetitionSponsors(compId: string | undefined) {
  return useQuery({
    queryKey: ["competition-sponsors", compId],
    enabled: !!compId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competition_sponsors" as any)
        .select("*")
        .eq("competition_id", compId!)
        .order("sort_order");
      if (error) throw error;
      return data as unknown as CompetitionSponsor[];
    },
  });
}

export function useCreateSponsor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { competition_id: string; name: string; logo_url: string; website_url?: string; sort_order?: number }) => {
      const { data, error } = await supabase.from("competition_sponsors" as any).insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["competition-sponsors", v.competition_id] });
      toast({ title: "Sponsor added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteSponsor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, competition_id }: { id: string; competition_id: string }) => {
      const { error } = await supabase.from("competition_sponsors" as any).delete().eq("id", id);
      if (error) throw error;
      return competition_id;
    },
    onSuccess: (cid) => {
      qc.invalidateQueries({ queryKey: ["competition-sponsors", cid] });
      toast({ title: "Sponsor removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
