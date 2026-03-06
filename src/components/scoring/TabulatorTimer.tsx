import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, User, Timer, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  useInsertTimerEvent,
  useUpsertDuration,
  usePerformanceDurations,
  useTimerEventsRealtime,
  useDurationsRealtime,
  getAvgDuration,
} from "@/hooks/usePerformanceTimer";

interface TabulatorTimerProps {
  subEventId: string;
  timeLimitSeconds: number;
  gracePeriodSeconds: number;
  contestants: Array<{ id: string; full_name: string }>;
  onDurationChange?: (seconds: number) => void;
  onContestantChange?: (contestantId: string) => void;
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
  const [selectedContestantId, setSelectedContestantId] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef(elapsed);
  elapsedRef.current = elapsed;

  const insertEvent = useInsertTimerEvent();
  const upsertDuration = useUpsertDuration();
  const { data: durations } = usePerformanceDurations(subEventId);
  useTimerEventsRealtime(subEventId);
  useDurationsRealtime(subEventId);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

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

    // Fire start event
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

    // Fire stop event
    insertEvent.mutate({
      sub_event_id: subEventId,
      contestant_registration_id: selectedContestantId,
      tabulator_id: user.id,
      event_type: "stop",
      elapsed_seconds: finalElapsed,
    });

    // Upsert duration
    upsertDuration.mutate({
      sub_event_id: subEventId,
      contestant_registration_id: selectedContestantId,
      tabulator_id: user.id,
      duration_seconds: finalElapsed,
    });
  }, [clearTimer, selectedContestantId, user, subEventId, insertEvent, upsertDuration]);

  const reset = useCallback(() => {
    clearTimer();
    setRunning(false);
    setElapsed(0);
    onDurationChange?.(0);
  }, [clearTimer, onDurationChange]);

  // Cleanup on unmount
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
    onContestantChange?.(selectedContestantId);
  }, [selectedContestantId]);

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
  const avgDuration = selectedContestantId ? getAvgDuration(durations, selectedContestantId) : 0;

  return (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Performance Timer</span>
          <span className="text-[10px] text-muted-foreground ml-auto font-mono">Space to start/stop</span>
        </div>

        {/* Contestant pills */}
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Contestant on Stage</label>
          <div className="flex flex-wrap gap-1.5">
            {contestants.map((c) => (
              <button
                key={c.id}
                disabled={running && selectedContestantId !== c.id}
                onClick={() => setSelectedContestantId(selectedContestantId === c.id ? "" : c.id)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border transition-all font-medium",
                  selectedContestantId === c.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/50 text-foreground border-border/50 hover:bg-muted hover:border-border",
                  running && selectedContestantId !== c.id && "opacity-40 cursor-not-allowed"
                )}
              >
                {c.full_name}
              </button>
            ))}
          </div>
        </div>

        {selectedContestantId && (
          <>
            {/* Green contestant pill + LIVE badge above timer */}
            <div className="flex items-center justify-center gap-2">
              <Badge className="gap-1.5 bg-secondary/20 text-secondary border border-secondary/30 px-3 py-1">
                <User className="h-3 w-3" />
                {selectedName}
              </Badge>
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

            {/* Show average duration if recorded */}
            {avgDuration > 0 && !running && (
              <div className="text-xs text-muted-foreground text-center font-mono">
                Avg. recorded duration: {Math.floor(avgDuration / 60)}:{String(Math.floor(avgDuration % 60)).padStart(2, "0")}
                {durations && durations.filter(d => d.contestant_registration_id === selectedContestantId).length > 1 && (
                  <span className="ml-1">
                    ({durations.filter(d => d.contestant_registration_id === selectedContestantId).length} tabulators)
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
