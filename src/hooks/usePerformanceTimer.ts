import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TimerEvent {
  id: string;
  sub_event_id: string;
  contestant_registration_id: string;
  tabulator_id: string;
  event_type: string;
  elapsed_seconds: number;
  created_at: string;
}

interface PerformanceDuration {
  id: string;
  sub_event_id: string;
  contestant_registration_id: string;
  tabulator_id: string;
  duration_seconds: number;
}

/** Get the latest timer event for a sub-event (used by judges for read-only view) */
export function useLatestTimerEvent(subEventId: string | undefined) {
  return useQuery({
    queryKey: ["timer_events_latest", subEventId],
    enabled: !!subEventId,
    refetchInterval: 1000, // poll every second for near-realtime
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_timer_events")
        .select("*")
        .eq("sub_event_id", subEventId!)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] as TimerEvent) || null;
    },
  });
}

/** Subscribe to timer events via realtime */
export function useTimerEventsRealtime(subEventId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!subEventId) return;
    const channel = supabase
      .channel(`timer_events_${subEventId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "performance_timer_events",
        filter: `sub_event_id=eq.${subEventId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["timer_events_latest", subEventId] });
        queryClient.invalidateQueries({ queryKey: ["performance_durations", subEventId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [subEventId, queryClient]);
}

/** Subscribe to duration changes via realtime */
export function useDurationsRealtime(subEventId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!subEventId) return;
    const channel = supabase
      .channel(`durations_${subEventId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "performance_durations",
        filter: `sub_event_id=eq.${subEventId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["performance_durations", subEventId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [subEventId, queryClient]);
}

/** Insert a timer event (start or stop) */
export function useInsertTimerEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      sub_event_id: string;
      contestant_registration_id: string;
      tabulator_id: string;
      event_type: "start" | "stop" | "on_stage" | "off_stage";
      elapsed_seconds: number;
    }) => {
      const { error } = await supabase
        .from("performance_timer_events")
        .insert(payload as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["timer_events_latest", vars.sub_event_id] });
    },
  });
}

/** Upsert the final duration for a contestant */
export function useUpsertDuration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      sub_event_id: string;
      contestant_registration_id: string;
      tabulator_id: string;
      duration_seconds: number;
    }) => {
      const { error } = await supabase
        .from("performance_durations")
        .upsert(payload as any, { onConflict: "sub_event_id,contestant_registration_id,tabulator_id" });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["performance_durations", vars.sub_event_id] });
    },
  });
}

/** Get all durations for a sub-event */
export function usePerformanceDurations(subEventId: string | undefined) {
  return useQuery({
    queryKey: ["performance_durations", subEventId],
    enabled: !!subEventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_durations")
        .select("*")
        .eq("sub_event_id", subEventId!);
      if (error) throw error;
      return (data || []) as PerformanceDuration[];
    },
  });
}

/** Compute average duration per contestant from all tabulators */
export function getAvgDuration(
  durations: PerformanceDuration[] | undefined,
  contestantRegId: string
): number {
  if (!durations) return 0;
  const contestantDurations = durations.filter(d => d.contestant_registration_id === contestantRegId);
  if (contestantDurations.length === 0) return 0;
  const sum = contestantDurations.reduce((acc, d) => acc + Number(d.duration_seconds), 0);
  return sum / contestantDurations.length;
}
