import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface Competition {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_by: string;
  created_at: string;
  active_scoring_level_id?: string | null;
  active_scoring_sub_event_id?: string | null;
  scoring_method?: string;
}

export interface CompetitionLevel {
  id: string;
  competition_id: string;
  name: string;
  sort_order: number;
}

export interface SubEvent {
  id: string;
  level_id: string;
  name: string;
  location: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  timer_visible?: boolean;
  comments_visible?: boolean;
}

export interface RubricCriterion {
  id: string;
  competition_id: string;
  name: string;
  sort_order: number;
  guidelines: string | null;
  weight_percent: number;
  description_1: string;
  description_2: string;
  description_3: string;
  description_4: string;
  description_5: string;
}

export interface RubricScaleLabels {
  min: number;
  max: number;
  labels: Record<string, string>;
}

export interface PenaltyRule {
  id: string;
  competition_id: string;
  time_limit_seconds: number;
  grace_period_seconds: number;
  sort_order: number;
  from_seconds: number;
  to_seconds: number | null;
  penalty_points: number;
}

export function useCompetitions() {
  return useQuery({
    queryKey: ["competitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Competition[];
    },
  });
}

export function useCompetition(id: string | undefined) {
  return useQuery({
    queryKey: ["competition", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Competition;
    },
  });
}

export function useLevels(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["levels", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competition_levels")
        .select("*")
        .eq("competition_id", competitionId!)
        .order("sort_order");
      if (error) throw error;
      return data as CompetitionLevel[];
    },
  });
}

export function useSubEvents(levelId: string | undefined) {
  return useQuery({
    queryKey: ["sub_events", levelId],
    enabled: !!levelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_events")
        .select("*")
        .eq("level_id", levelId!)
        .order("event_date");
      if (error) throw error;
      return data as SubEvent[];
    },
  });
}

export function useAllSubEvents(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["all_sub_events", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      // First get all levels for the competition
      const { data: levels, error: levelsError } = await supabase
        .from("competition_levels")
        .select("id")
        .eq("competition_id", competitionId!);

      if (levelsError) throw levelsError;

      if (!levels || levels.length === 0) return [];

      // Then get all sub-events for those levels
      const levelIds = levels.map(l => l.id);
      const { data, error } = await supabase
        .from("sub_events")
        .select("*")
        .in("level_id", levelIds)
        .order("event_date");

      if (error) throw error;
      return data as SubEvent[];
    },
  });
}

export function useSubEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["sub_event", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_events")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as SubEvent;
    },
  });
}

export function useRubricCriteria(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["rubric_criteria", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rubric_criteria")
        .select("*")
        .eq("competition_id", competitionId!)
        .order("sort_order");
      if (error) throw error;
      return data as RubricCriterion[];
    },
  });
}

export function usePenaltyRules(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["penalty_rules", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("penalty_rules")
        .select("*")
        .eq("competition_id", competitionId!)
        .order("sort_order");
      if (error) throw error;
      return data as PenaltyRule[];
    },
  });
}

export function useCreateCompetition() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: { name: string; slug?: string; description?: string; start_date?: string; end_date?: string }) => {
      const slug = values.slug || values.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || crypto.randomUUID().slice(0, 8);
      const { slug: _s, ...rest } = values;
      const { data, error } = await supabase
        .from("competitions")
        .insert({ ...rest, created_by: user!.id, slug } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitions"] });
      toast({ title: "Competition created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateCompetition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; name?: string; description?: string; start_date?: string; end_date?: string; status?: string }) => {
      const { error } = await supabase.from("competitions").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["competitions"] });
      qc.invalidateQueries({ queryKey: ["competition", v.id] });
      toast({ title: "Competition updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateActiveScoringConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ competitionId, levelId, subEventId }: { competitionId: string; levelId: string | null; subEventId: string | null }) => {
      const { error } = await supabase
        .from("competitions")
        .update({ 
          active_scoring_level_id: levelId,
          active_scoring_sub_event_id: subEventId 
        })
        .eq("id", competitionId);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["competition", v.competitionId] });
      toast({ title: "Active scoring updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteCompetition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("competitions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitions"] });
      toast({ title: "Competition deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// Level mutations
export function useCreateLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { competition_id: string; name: string; sort_order: number }) => {
      const { data, error } = await supabase.from("competition_levels").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["levels", v.competition_id] });
      toast({ title: "Level added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, competition_id }: { id: string; competition_id: string }) => {
      const { error } = await supabase.from("competition_levels").delete().eq("id", id);
      if (error) throw error;
      return competition_id;
    },
    onSuccess: (cid) => {
      qc.invalidateQueries({ queryKey: ["levels", cid] });
      toast({ title: "Level deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// SubEvent mutations
export function useCreateSubEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { level_id: string; name: string; location?: string; event_date?: string; start_time?: string; end_time?: string; voting_enabled?: boolean }) => {
      const { data, error } = await supabase.from("sub_events").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["sub_events", v.level_id] });
      toast({ title: "Sub-event added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteSubEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, level_id }: { id: string; level_id: string }) => {
      const { error } = await supabase.from("sub_events").delete().eq("id", id);
      if (error) throw error;
      return level_id;
    },
    onSuccess: (lid) => {
      qc.invalidateQueries({ queryKey: ["sub_events", lid] });
      toast({ title: "Sub-event deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// Rubric mutations
export function useCreateRubricCriterion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<RubricCriterion, "id">) => {
      const { data, error } = await supabase.from("rubric_criteria").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["rubric_criteria", v.competition_id] });
      toast({ title: "Criterion added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateRubricCriterion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<RubricCriterion> & { id: string }) => {
      const { error } = await supabase.from("rubric_criteria").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rubric_criteria"] });
      toast({ title: "Criterion updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteRubricCriterion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, competition_id }: { id: string; competition_id: string }) => {
      const { error } = await supabase.from("rubric_criteria").delete().eq("id", id);
      if (error) throw error;
      return competition_id;
    },
    onSuccess: (cid) => {
      qc.invalidateQueries({ queryKey: ["rubric_criteria", cid] });
      toast({ title: "Criterion deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// Penalty mutations
export function useCreatePenaltyRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<PenaltyRule, "id">) => {
      const { data, error } = await supabase.from("penalty_rules").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["penalty_rules", v.competition_id] });
      toast({ title: "Penalty rule added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeletePenaltyRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, competition_id }: { id: string; competition_id: string }) => {
      const { error } = await supabase.from("penalty_rules").delete().eq("id", id);
      if (error) throw error;
      return competition_id;
    },
    onSuccess: (cid) => {
      qc.invalidateQueries({ queryKey: ["penalty_rules", cid] });
      toast({ title: "Penalty rule deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
