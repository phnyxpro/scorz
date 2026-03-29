import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompetitions } from "@/hooks/useCompetitions";
import { useMyAssignedSubEvents } from "@/hooks/useSubEventAssignments";

/**
 * Represents the restricted roles that operate within the scope of a specific sub-event.
 * These staff members are assigned via the `sub_event_assignments` table.
 */
export type StaffRole = "judge" | "tabulator";

/**
 * A custom hook to fetch and aggregate data for a staff member (like a judge or tabulator).
 * It retrieves the user's assigned sub-events, the details of those sub-events (including parent level),
 * and the top-level competitions they belong to.
 * 
 * Falls back to `staff_invitations` + `staff_invitation_sub_events` when
 * `sub_event_assignments` is empty (invitation not yet accepted).
 */
export function useStaffView(role?: StaffRole) {
    const { user } = useAuth();
    const { data: competitions, isLoading: compsLoading } = useCompetitions();
    const { data: myAssignments, isLoading: assignmentsLoading } = useMyAssignedSubEvents(role);

    // Fall back to staff_invitations when no direct assignments exist
    const { data: fallbackSubEventIds, isLoading: fallbackLoading } = useQuery({
        queryKey: ["staff_invitation_fallback", user?.id, user?.email, role],
        enabled: !!user?.email && !assignmentsLoading && (!myAssignments || myAssignments.length === 0),
        queryFn: async () => {
            const { data: invites } = await supabase
                .from("staff_invitations")
                .select("id, is_chief, role")
                .ilike("email", user!.email!)
                .is("accepted_at", null);

            if (!invites?.length) return [];

            // Filter by role if specified
            const filtered = role ? invites.filter(i => i.role === role) : invites;
            if (!filtered.length) return [];

            const inviteIds = filtered.map(i => i.id);
            const { data: invSubEvents } = await supabase
                .from("staff_invitation_sub_events")
                .select("sub_event_id")
                .in("staff_invitation_id", inviteIds);

            return invSubEvents?.map(s => s.sub_event_id) || [];
        },
    });

    // Get distinct sub-event IDs from assignments OR fallback
    const assignedSubEventIds = useMemo(() => {
        if (myAssignments && myAssignments.length > 0) {
            return [...new Set(myAssignments.map((a) => a.sub_event_id))];
        }
        if (fallbackSubEventIds && fallbackSubEventIds.length > 0) {
            return [...new Set(fallbackSubEventIds)];
        }
        return [];
    }, [myAssignments, fallbackSubEventIds]);

    // Fetch sub-event details to get competition_id and level_id
    const { data: subEventDetails, isLoading: detailsLoading } = useQuery({
        queryKey: ["assigned_sub_events_details", assignedSubEventIds],
        enabled: assignedSubEventIds.length > 0,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("sub_events")
                .select("*, level:competition_levels(*)")
                .in("id", assignedSubEventIds);
            if (error) throw error;
            return data;
        },
    });

    const assignedCompetitions = useMemo(() => {
        if (!subEventDetails || !competitions) return [];
        const compIds = [...new Set(subEventDetails.map((se) => se.level.competition_id))];
        return competitions.filter((c) => compIds.includes(c.id));
    }, [subEventDetails, competitions]);

    const isFallback = !myAssignments?.length && (fallbackSubEventIds?.length ?? 0) > 0;

    return {
        assignedCompetitions,
        subEventDetails,
        myAssignments,
        isLoading: compsLoading || assignmentsLoading || 
            ((!myAssignments || myAssignments.length === 0) && fallbackLoading) ||
            (assignedSubEventIds.length > 0 && detailsLoading),
        isFallback,
    };
}
