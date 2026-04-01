import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface ContestantRegistration {
  id: string;
  user_id: string;
  competition_id: string;
  sub_event_id: string | null;
  full_name: string;
  age_category: string;
  location: string | null;
  phone: string | null;
  email: string;
  guardian_name: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  bio: string | null;
  social_handles: Record<string, string> | null;
  performance_video_url: string | null;
  profile_photo_url: string | null;
  rules_acknowledged: boolean;
  rules_acknowledged_at: string | null;
  contestant_signature: string | null;
  contestant_signed_at: string | null;
  guardian_signature: string | null;
  guardian_signed_at: string | null;
  status: string;
  special_entry_type: string | null;
  sort_order: number;
  custom_field_values: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export function useMyRegistration(competitionId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_registration", competitionId, user?.id],
    enabled: !!competitionId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contestant_registrations")
        .select("*")
        .eq("competition_id", competitionId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ContestantRegistration | null;
    },
  });
}

export function useRegistrations(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["registrations", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contestant_registrations")
        .select("*")
        .eq("competition_id", competitionId!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ContestantRegistration[];
    },
  });
}

export function useCreateRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<ContestantRegistration> & { user_id: string; competition_id: string; full_name: string; email: string }) => {
      const { data, error } = await supabase
        .from("contestant_registrations")
        .insert(values)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") {
          throw new Error("This contestant is already registered for this competition.");
        }
        throw error;
      }
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["my_registration", v.competition_id] });
      qc.invalidateQueries({ queryKey: ["registrations", v.competition_id] });
      toast({ title: "Registration submitted!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<ContestantRegistration> & { id: string }) => {
      const { error } = await supabase
        .from("contestant_registrations")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_registration"] });
      qc.invalidateQueries({ queryKey: ["registrations"] });
      toast({ title: "Registration updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useRegistrationsRealtime(competitionId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!competitionId) return;
    const channel = supabase
      .channel(`reg-order-${competitionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "contestant_registrations" },
        (payload) => {
          if ((payload.new as any)?.competition_id === competitionId) {
            qc.invalidateQueries({ queryKey: ["registrations", competitionId] });
            qc.invalidateQueries({ queryKey: ["judging_overview", competitionId] });
            qc.invalidateQueries({ queryKey: ["approved-contestants-order"] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [competitionId, qc]);
}
