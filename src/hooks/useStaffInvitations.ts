import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface StaffInvitation {
    id: string;
    email: string;
    role: AppRole;
    competition_id: string;
    invited_by: string;
    created_at: string;
    accepted_at: string | null;
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
            return data as StaffInvitation[];
        },
    });
}

export function useInviteStaff() {
    const qc = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ email, role, competitionId, competitionName }: { email: string; role: AppRole; competitionId: string; competitionName?: string }) => {
            const { data, error } = await (supabase
                .from("staff_invitations" as any)
                .insert({
                    email,
                    role,
                    competition_id: competitionId,
                    invited_by: user?.id,
                })
                .select()
                .single() as any);

            if (error) {
                if (error.code === "23505") {
                    throw new Error("This user is already invited with this role.");
                }
                throw error;
            }

            // Send invitation email with magic link
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
            toast({ title: "Invitation revoked" });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}
