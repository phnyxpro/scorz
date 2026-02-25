import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SubEventAssignment {
  id: string;
  sub_event_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface ProfileWithRoles {
  user_id: string;
  full_name: string | null;
  email: string | null;
  roles: string[];
}

export function useSubEventAssignments(subEventId: string | undefined) {
  return useQuery({
    queryKey: ["sub_event_assignments", subEventId],
    enabled: !!subEventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_event_assignments")
        .select("*")
        .eq("sub_event_id", subEventId!)
        .order("created_at");
      if (error) throw error;
      return data as SubEventAssignment[];
    },
  });
}

/** Fetch all users who have assignable roles (judge, chief_judge, tabulator, witness) */
export function useAssignableUsers() {
  return useQuery({
    queryKey: ["assignable_users"],
    queryFn: async () => {
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["judge", "chief_judge", "tabulator", "witness"]);
      if (rolesErr) throw rolesErr;

      const userIds = [...new Set((roles || []).map((r) => r.user_id))];
      if (userIds.length === 0) return [] as ProfileWithRoles[];

      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      if (profErr) throw profErr;

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      const result: ProfileWithRoles[] = [];
      for (const uid of userIds) {
        const p = profileMap.get(uid);
        result.push({
          user_id: uid,
          full_name: p?.full_name || null,
          email: p?.email || null,
          roles: (roles || []).filter((r) => r.user_id === uid).map((r) => r.role),
        });
      }
      return result;
    },
  });
}

export function useAddAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { sub_event_id: string; user_id: string; role: string }) => {
      const { data, error } = await supabase
        .from("sub_event_assignments")
        .insert({ sub_event_id: values.sub_event_id, user_id: values.user_id, role: values.role as any })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["sub_event_assignments", v.sub_event_id] });
      toast({ title: "User assigned" });
    },
    onError: (e: any) => toast({ title: "Error assigning", description: e.message, variant: "destructive" }),
  });
}

export function useRemoveAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, sub_event_id }: { id: string; sub_event_id: string }) => {
      const { error } = await supabase.from("sub_event_assignments").delete().eq("id", id);
      if (error) throw error;
      return sub_event_id;
    },
    onSuccess: (subEventId) => {
      qc.invalidateQueries({ queryKey: ["sub_event_assignments", subEventId] });
      toast({ title: "Assignment removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
