import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface StaffInvitation {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: AppRole;
  competition_id: string;
  sub_event_id: string | null;
  is_chief: boolean;
  is_production_assistant: boolean;
  invited_by: string;
  created_at: string;
  accepted_at: string | null;
  invited_at: string | null;
}

export interface StaffInvitationSubEvent {
  id: string;
  staff_invitation_id: string;
  sub_event_id: string;
  created_at: string;
}

export function useStaffInvitationSubEvents(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["staff_invitation_sub_events", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      // Get all invitation IDs for this competition first
      const { data: invitations } = await (supabase
        .from("staff_invitations" as any)
        .select("id")
        .eq("competition_id", competitionId!) as any);

      if (!invitations?.length) return [] as StaffInvitationSubEvent[];

      const ids = invitations.map((i: any) => i.id);
      const { data, error } = await (supabase
        .from("staff_invitation_sub_events" as any)
        .select("*")
        .in("staff_invitation_id", ids) as any);

      if (error) throw error;
      return (data || []) as StaffInvitationSubEvent[];
    },
  });
}

export function useStaffInvitations(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["staff_invitations", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("staff_invitations" as any)
        .select("*")
        .eq("competition_id", competitionId!)
        .order("created_at", { ascending: false }) as any);

      if (error) throw error;
      return (data || []) as StaffInvitation[];
    },
  });
}

/** Add staff member to roster, auto-create account, and send notification */
export function useAddStaffMember() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, email, phone, role, competitionId, competitionName, isChief, isProductionAssistant, levelName, subEventNames }: {
      name?: string; email: string; phone?: string; role: AppRole; competitionId: string;
      competitionName?: string; isChief?: boolean; isProductionAssistant?: boolean; levelName?: string; subEventNames?: string[];
    }) => {
      const { data, error } = await (supabase
        .from("staff_invitations" as any)
        .insert({
          name: name || null,
          email,
          phone: phone || null,
          role,
          competition_id: competitionId,
          invited_by: user?.id,
          is_chief: isChief || false,
          is_production_assistant: isProductionAssistant || false,
          invited_at: new Date().toISOString(),
        })
        .select()
        .single() as any);

      if (error) {
        if (error.code === "23505") {
          throw new Error("This person is already added with this role.");
        }
        throw error;
      }

      // Auto-create account and send notification email
      try {
        await supabase.functions.invoke("send-staff-invite", {
          body: {
            email,
            role,
            competition_name: competitionName || "",
            competition_id: competitionId,
            level_name: levelName || "",
            sub_event_names: subEventNames || [],
          },
        });
      } catch (emailErr) {
        console.error("Failed to send staff notification:", emailErr);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["staff_invitations", variables.competitionId] });
      toast({ title: "Staff added & notified", description: `${variables.email} added as ${variables.role} and notification sent.` });
    },
    onError: (error: any) => {
      toast({ title: "Error adding staff", description: error.message, variant: "destructive" });
    },
  });
}

/** Send invitation email to a staff member */
export function useSendStaffInvite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, email, role, competitionId, competitionName }: {
      id: string; email: string; role: AppRole; competitionId: string; competitionName?: string;
    }) => {
      // Mark as invited
      await (supabase
        .from("staff_invitations" as any)
        .update({ invited_at: new Date().toISOString() })
        .eq("id", id) as any);

      // Send email
      await supabase.functions.invoke("send-staff-invite", {
        body: {
          email,
          role,
          competition_name: competitionName || "",
          competition_id: competitionId,
        },
      });

      return { id, competitionId };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["staff_invitations", result.competitionId] });
      toast({ title: "Invitation sent" });
    },
    onError: (error: any) => {
      toast({ title: "Error sending invite", description: error.message, variant: "destructive" });
    },
  });
}

/** Add a sub-event assignment for a staff invitation */
export function useAddStaffSubEvent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ staffInvitationId, subEventId, competitionId }: { staffInvitationId: string; subEventId: string; competitionId: string }) => {
      const { error } = await (supabase
        .from("staff_invitation_sub_events" as any)
        .insert({ staff_invitation_id: staffInvitationId, sub_event_id: subEventId }) as any);

      if (error) {
        if (error.code === "23505") throw new Error("Already assigned to this sub-event.");
        throw error;
      }
      return competitionId;
    },
    onSuccess: (competitionId) => {
      qc.invalidateQueries({ queryKey: ["staff_invitation_sub_events", competitionId] });
      toast({ title: "Sub-event assigned" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

/** Remove a sub-event assignment from a staff invitation */
export function useRemoveStaffSubEvent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, competitionId }: { id: string; competitionId: string }) => {
      const { error } = await (supabase
        .from("staff_invitation_sub_events" as any)
        .delete()
        .eq("id", id) as any);

      if (error) throw error;
      return competitionId;
    },
    onSuccess: (competitionId) => {
      qc.invalidateQueries({ queryKey: ["staff_invitation_sub_events", competitionId] });
      toast({ title: "Sub-event removed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

/** Legacy: Assign a staff invitation to a sub-event (single) */
export function useAssignStaffToSubEvent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, subEventId, competitionId }: { id: string; subEventId: string | null; competitionId: string }) => {
      const { error } = await (supabase
        .from("staff_invitations" as any)
        .update({ sub_event_id: subEventId })
        .eq("id", id) as any);

      if (error) throw error;
      return competitionId;
    },
    onSuccess: (competitionId) => {
      qc.invalidateQueries({ queryKey: ["staff_invitations", competitionId] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

/** Legacy invite that adds + sends in one step */
export function useInviteStaff() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, email, phone, role, competitionId, competitionName, isChief }: { name?: string; email: string; phone?: string; role: AppRole; competitionId: string; competitionName?: string; isChief?: boolean }) => {
      const { data, error } = await (supabase
        .from("staff_invitations" as any)
        .insert({
          name: name || null,
          email,
          phone: phone || null,
          role,
          competition_id: competitionId,
          invited_by: user?.id,
          invited_at: new Date().toISOString(),
          is_chief: isChief || false,
        })
        .select()
        .single() as any);

      if (error) {
        if (error.code === "23505") {
          throw new Error("This user is already invited with this role.");
        }
        throw error;
      }

      try {
        await supabase.functions.invoke("send-staff-invite", {
          body: {
            email,
            role,
            competition_name: competitionName || "",
            competition_id: competitionId,
          },
        });
      } catch (emailErr) {
        console.error("Failed to send invitation email:", emailErr);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["staff_invitations", variables.competitionId] });
      toast({ title: "Invitation sent", description: `Invitation sent to ${variables.email}` });
    },
    onError: (error: any) => {
      toast({ title: "Error inviting staff", description: error.message, variant: "destructive" });
    },
  });
}

/** Update a staff invitation's details */
export function useUpdateStaffInvitation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, competitionId, updates }: {
      id: string;
      competitionId: string;
      updates: { name?: string | null; email?: string; phone?: string | null; role?: AppRole; is_chief?: boolean };
    }) => {
      const { error } = await (supabase
        .from("staff_invitations" as any)
        .update(updates)
        .eq("id", id) as any);

      if (error) {
        if (error.code === "23505") throw new Error("A staff member with this email and role already exists.");
        throw error;
      }
      return competitionId;
    },
    onSuccess: (competitionId) => {
      qc.invalidateQueries({ queryKey: ["staff_invitations", competitionId] });
      toast({ title: "Staff member updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating staff", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteInvitation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, competitionId }: { id: string; competitionId: string }) => {
      const { error } = await (supabase
        .from("staff_invitations" as any)
        .delete()
        .eq("id", id) as any);

      if (error) throw error;
      return competitionId;
    },
    onSuccess: (competitionId) => {
      qc.invalidateQueries({ queryKey: ["staff_invitations", competitionId] });
      toast({ title: "Staff member removed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
