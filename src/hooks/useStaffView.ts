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
export type StaffRole = "judge" | "chief_judge" | "tabulator" | "witness";

/**
 * A custom hook to fetch and aggregate data for a staff member (like a judge or tabulator).
 * It retrieves the user's assigned sub-events, the details of those sub-events (including parent level),
 * and the top-level competitions they belong to.
 * 
 * @param {StaffRole} [role] - Optional filter to only fetch assignments where the user has this specific role.
 * @returns An object containing:
 * - `assignedCompetitions`: An array of `Competition` objects the user is assigned to.
 * - `subEventDetails`: An array of `SubEvent` objects (with nested `level` data) the user is assigned to.
 * - `myAssignments`: The raw assignment records from `sub_event_assignments`.
 * - `isLoading`: Boolean indicating if any of the underlying queries are still loading.
 */
export function useStaffView(role?: StaffRole) {
    const { user } = useAuth();
    const { data: competitions, isLoading: compsLoading } = useCompetitions();
    const { data: myAssignments, isLoading: assignmentsLoading } = useMyAssignedSubEvents(role);

    // Get distinct sub-event IDs from assignments
    const assignedSubEventIds = useMemo(() => {
        if (!myAssignments) return [];
        return [...new Set(myAssignments.map((a) => a.sub_event_id))];
    }, [myAssignments]);

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

    return {
        assignedCompetitions,
        subEventDetails,
        myAssignments,
        isLoading: compsLoading || assignmentsLoading || (assignedSubEventIds.length > 0 && detailsLoading),
    };
}
