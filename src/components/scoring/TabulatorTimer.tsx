import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, User, Timer, GripVertical, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useInsertTimerEvent,
  useUpsertDuration,
  usePerformanceDurations,
  useTimerEventsRealtime,
  useDurationsRealtime,
  getAvgDuration,
} from "@/hooks/usePerformanceTimer";
import { friendlyDisplayName } from "@/lib/utils";

interface TabulatorTimerProps {
  subEventId: string;
  timeLimitSeconds: number;
  gracePeriodSeconds: number;
  contestants: Array<{ id: string; full_name: string }>;
  onDurationChange?: (seconds: number) => void;
  onContestantChange?: (contestantId: string) => void;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TabulatorTimer({
  subEventId,
  timeLimitSeconds,
  gracePeriodSeconds,
  contestants,
  onDurationChange,
  onContestantChange,
}: TabulatorTimerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedContestantId, setSelectedContestantId] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [isOnStage, setIsOnStage] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef(elapsed);
  elapsedRef.current = elapsed;

  // Drag state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const insertEvent = useInsertTimerEvent();
  const upsertDuration = useUpsertDuration();
  const { data: durations } = usePerformanceDurations(subEventId);
  useTimerEventsRealtime(subEventId);
  useDurationsRealtime(subEventId);

  // Fetch tabulator profiles for multi-tabulator display
  const tabulatorIds = useMemo(() => {
    if (!durations || !selectedContestantId) return [];
    return [...new Set(durations.filter(d => d.contestant_registration_id === selectedContestantId).map(d => d.tabulator_id))];
  }, [durations, selectedContestantId]);

  const { data: tabulatorProfiles } = useQuery({
    queryKey: ["tabulator-profiles", tabulatorIds],
    enabled: tabulatorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", tabulatorIds);
      if (error) throw error;
      return data;
    },
  });

  const tabulatorName = useCallback((id: string) => {
    const p = tabulatorProfiles?.find(p => p.user_id === id);
    return p ? friendlyDisplayName(p.full_name, p.email) : id.slice(0, 8);
  }, [tabulatorProfiles]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const broadcastOnStage = useCallback(async (regId: string) => {
    if (!user) return;
    await supabase.from("performance_timer_events").insert({
      sub_event_id: subEventId,
      contestant_registration_id: regId,
      tabulator_id: user.id,
      event_type: "on_stage",
      elapsed_seconds: 0,
    } as any);
    queryClient.invalidateQueries({ queryKey: ["timer_events_latest", subEventId] });
  }, [user, subEventId, queryClient]);

  const broadcastOffStage = useCallback(async (regId: string) => {
    if (!user) return;
    await supabase.from("performance_timer_events").insert({
      sub_event_id: subEventId,
      contestant_registration_id: regId,
      tabulator_id: user.id,
      event_type: "off_stage",
      elapsed_seconds: 0,
    } as any);
    queryClient.invalidateQueries({ queryKey: ["timer_events_latest", subEventId] });
  }, [user, subEventId, queryClient]);

  const start = useCallback(() => {
    if (!selectedContestantId || !user) return;
    if (intervalRef.current) return;
    startTimeRef.current = Date.now() - elapsedRef.current * 1000;
    intervalRef.current = setInterval(() => {
      const secs = (Date.now() - startTimeRef.current) / 1000;
      setElapsed(secs);
      onDurationChange?.(secs);
    }, 50);
    setRunning(true);

    insertEvent.mutate({
      sub_event_id: subEventId,
      contestant_registration_id: selectedContestantId,
      tabulator_id: user.id,
      event_type: "start",
      elapsed_seconds: elapsedRef.current,
    });
  }, [selectedContestantId, user, subEventId, insertEvent, onDurationChange]);

  const stop = useCallback(() => {
    clearTimer();
    setRunning(false);
    if (!selectedContestantId || !user) return;

    const finalElapsed = elapsedRef.current;

    insertEvent.mutate({
      sub_event_id: subEventId,
      contestant_registration_id: selectedContestantId,
      tabulator_id: user.id,
      event_type: "stop",
      elapsed_seconds: finalElapsed,
    });

    upsertDuration.mutate({
      sub_event_id: subEventId,
      contestant_registration_id: selectedContestantId,
      tabulator_id: user.id,
      duration_seconds: finalElapsed,
    });

    // Push duration into judge_scores for this contestant
    supabase.from("judge_scores")
      .update({ performance_duration_seconds: finalElapsed })
      .eq("sub_event_id", subEventId)
      .eq("contestant_registration_id", selectedContestantId)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["judge_scores"] });
      });
  }, [clearTimer, selectedContestantId, user, subEventId, insertEvent, upsertDuration, queryClient]);

  const reset = useCallback(() => {
    clearTimer();
    setRunning(false);
    setElapsed(0);
    onDurationChange?.(0);
  }, [clearTimer, onDurationChange]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  // Spacebar shortcut
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!selectedContestantId) return;
      if (e.code === "Space") {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
        e.preventDefault();
        if (intervalRef.current) stop();
        else start();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [start, stop, selectedContestantId]);

  // Reset timer when contestant changes and notify parent
  useEffect(() => {
    reset();
    setIsOnStage(false);
    onContestantChange?.(selectedContestantId);
  }, [selectedContestantId]);

  // Drag handlers
  const handleDragStart = (idx: number) => {
    dragItem.current = idx;
    setDragIdx(idx);
  };
  const handleDragEnter = (idx: number) => {
    dragOverItem.current = idx;
    setOverIdx(idx);
  };
  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const from = dragItem.current;
    const to = dragOverItem.current;
    dragItem.current = null;
    dragOverItem.current = null;
    setDragIdx(null);
    setOverIdx(null);
    if (from === to) return;

    const reordered = [...contestants];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    const updates = reordered.map((c, i) =>
      supabase.from("contestant_registrations").update({ sort_order: i + 1 }).eq("id", c.id)
    );
    await Promise.all(updates);
    queryClient.invalidateQueries({ queryKey: ["judging_overview"] });
    queryClient.invalidateQueries({ queryKey: ["approved-contestants-order"] });
  };

  const handleToggleOnStage = async () => {
    if (!selectedContestantId) return;
    if (isOnStage) {
      await broadcastOffStage(selectedContestantId);
      setIsOnStage(false);
    } else {
      await broadcastOnStage(selectedContestantId);
      setIsOnStage(true);
    }
  };

  const graceStart = timeLimitSeconds;
  const penaltyStart = timeLimitSeconds + gracePeriodSeconds;

  let zoneClass = "text-foreground";
  let bgClass = "bg-card/80";
  if (elapsed > penaltyStart) {
    zoneClass = "text-destructive";
    bgClass = "bg-destructive/10";
  } else if (elapsed > graceStart) {
    zoneClass = "text-primary";
    bgClass = "bg-primary/10";
  }

  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60);
  const tenths = Math.floor((elapsed * 10) % 10);

  const selectedName = contestants.find(c => c.id === selectedContestantId)?.full_name;

  // Multi-tabulator durations for selected contestant
  const contestantDurations = useMemo(() => {
    if (!durations || !selectedContestantId) return [];
    return durations.filter(d => d.contestant_registration_id === selectedContestantId);
  }, [durations, selectedContestantId]);
  const avgDuration = selectedContestantId ? getAvgDuration(durations, selectedContestantId) : 0;

  return (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Performance Timer</span>
          <span className="text-[10px] text-muted-foreground ml-auto font-mono">Space to start/stop</span>
        </div>

        {/* Draggable contestant list */}
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Contestant on Stage</label>
          <div className="space-y-0.5">
            {contestants.map((c, idx) => (
              <div
                key={c.id}
                draggable={!running}
                onDragStart={() => !running && handleDragStart(idx)}
                onDragEnter={() => !running && handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md border border-transparent transition-all select-none",
                  !running && "cursor-grab active:cursor-grabbing",
                  running && selectedContestantId !== c.id && "opacity-40 cursor-not-allowed",
                  selectedContestantId === c.id && "bg-primary/10 border-primary/30",
                  dragIdx === idx && "opacity-40 border-dashed border-primary/50",
                  overIdx === idx && dragIdx !== idx && "border-primary/40 bg-primary/5",
                  dragIdx === null && !running && "hover:bg-muted/30"
                )}
                onClick={() => {
                  if (running && selectedContestantId !== c.id) return;
                  setSelectedContestantId(selectedContestantId === c.id ? "" : c.id);
                }}
              >
                {!running && <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                <span className="font-mono text-[10px] text-muted-foreground w-4 text-center">{idx + 1}</span>
                <span className="text-xs font-medium text-foreground flex-1 truncate">{c.full_name}</span>
                {selectedContestantId === c.id && isOnStage && (
                  <Badge className="bg-secondary/20 text-secondary border-secondary/30 text-[9px] px-1.5 py-0">On Stage</Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {selectedContestantId && (
          <>
            {/* Contestant badge + On Stage button + LIVE badge */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Badge className="gap-1.5 bg-secondary/20 text-secondary border border-secondary/30 px-3 py-1">
                <User className="h-3 w-3" />
                {selectedName}
              </Badge>
              {!running && (
                <Button
                  size="sm"
                  variant={isOnStage ? "secondary" : "outline"}
                  className={cn("gap-1.5 h-7 text-xs", isOnStage && "bg-secondary/20 text-secondary border-secondary/30")}
                  onClick={handleToggleOnStage}
                >
                  <Radio className="h-3 w-3" />
                  {isOnStage ? "On Stage" : "Set On Stage"}
                </Button>
              )}
              {running && (
                <Badge variant="default" className="gap-1 bg-destructive/20 text-destructive border border-destructive/30">
                  <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  LIVE
                </Badge>
              )}
            </div>

            <Card className={`border-border/50 ${bgClass} transition-colors duration-300`}>
              <CardContent className="flex flex-col items-center py-6">
                <div className={`font-mono text-5xl font-bold tracking-wider ${zoneClass} transition-colors duration-300`}>
                  {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                  <span className="text-2xl opacity-60">.{tenths}</span>
                </div>

                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground font-mono">
                  <span>Limit: {Math.floor(timeLimitSeconds / 60)}:{String(timeLimitSeconds % 60).padStart(2, "0")}</span>
                  <span>·</span>
                  <span>Grace: {gracePeriodSeconds}s</span>
                </div>

                <div className="flex gap-2 mt-4">
                  {!running ? (
                    <Button onClick={start} size="sm" variant="default">
                      <Play className="h-4 w-4 mr-1" /> {elapsed > 0 ? "Resume" : "Start"}
                    </Button>
                  ) : (
                    <Button onClick={stop} size="sm" variant="secondary">
                      <Pause className="h-4 w-4 mr-1" /> Stop
                    </Button>
                  )}
                  <Button onClick={reset} disabled={running} size="sm" variant="outline">
                    <RotateCcw className="h-4 w-4 mr-1" /> Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Multi-tabulator durations display */}
            {!running && contestantDurations.length > 0 && (
              <div className="space-y-1 px-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Recorded Durations</p>
                {contestantDurations.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span>{tabulatorName(d.tabulator_id)}</span>
                    <span>{formatDuration(Number(d.duration_seconds))}</span>
                  </div>
                ))}
                {contestantDurations.length > 1 && (
                  <div className="flex items-center justify-between text-xs font-mono font-semibold text-foreground border-t border-border/30 pt-1 mt-1">
                    <span>Average</span>
                    <span>{formatDuration(avgDuration)}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
