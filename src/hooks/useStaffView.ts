import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompetitions } from "@/hooks/useCompetitions";
import { useMyAssignedSubEvents } from "@/hooks/useSubEventAssignments";

export type StaffRole = "judge" | "chief_judge" | "tabulator" | "witness";

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
