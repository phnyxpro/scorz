import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Play, Pause, RotateCcw, User, Timer, Radio, ChevronLeft, ChevronRight, ListOrdered, ArrowDownToLine, Pencil, Check, X } from "lucide-react";
import { ContestantReorderModal } from "./ContestantReorderModal";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

function parseMmSs(val: string): number | null {
  const parts = val.split(":");
  if (parts.length !== 2) return null;
  const m = parseInt(parts[0], 10);
  const s = parseInt(parts[1], 10);
  if (isNaN(m) || isNaN(s) || m < 0 || s < 0 || s >= 60) return null;
  return m * 60 + s;
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

  const [showReorderModal, setShowReorderModal] = useState(false);
  const [gridPage, setGridPage] = useState(0);
  const gridPageSize = 5;

  // Editable duration state
  const [editingDurationId, setEditingDurationId] = useState<string | null>(null);
  const [editDurationValue, setEditDurationValue] = useState("");

  const insertEvent = useInsertTimerEvent();
  const upsertDuration = useUpsertDuration();
  const { data: durations } = usePerformanceDurations(subEventId);
  useTimerEventsRealtime(subEventId);
  useDurationsRealtime(subEventId);

  // Timed contestant IDs (those with recorded durations)
  const timedContestantIds = useMemo(() => {
    if (!durations) return new Set<string>();
    return new Set(durations.map(d => d.contestant_registration_id));
  }, [durations]);

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

  useEffect(() => {
    reset();
    setIsOnStage(false);
    onContestantChange?.(selectedContestantId);
  }, [selectedContestantId]);

  // Move after last timed
  const moveAfterLastTimed = useCallback(async (contestantId: string) => {
    if (!durations || timedContestantIds.size === 0) return;
    const idx = contestants.findIndex(c => c.id === contestantId);
    if (idx < 0) return;
    let lastTimedIdx = -1;
    contestants.forEach((c, i) => {
      if (timedContestantIds.has(c.id)) lastTimedIdx = i;
    });
    if (lastTimedIdx < 0) return;
    const targetIdx = idx <= lastTimedIdx ? lastTimedIdx : lastTimedIdx + 1;
    if (targetIdx === idx) return;

    const reordered = [...contestants];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    const updates = reordered.map((c, i) =>
      supabase.from("contestant_registrations").update({ sort_order: i + 1 }).eq("id", c.id)
    );
    await Promise.all(updates);
    queryClient.invalidateQueries({ queryKey: ["judging_overview"] });
    queryClient.invalidateQueries({ queryKey: ["approved-contestants-order"] });
    toast({ title: "Moved after last timed contestant" });
  }, [contestants, durations, timedContestantIds, queryClient]);

  // Edit duration handlers
  const startEditDuration = (id: string, currentSeconds: number) => {
    setEditingDurationId(id);
    setEditDurationValue(formatDuration(currentSeconds));
  };

  const cancelEditDuration = () => {
    setEditingDurationId(null);
    setEditDurationValue("");
  };

  const saveEditDuration = async (durationId: string) => {
    const newSeconds = parseMmSs(editDurationValue);
    if (newSeconds === null) {
      toast({ title: "Invalid format", description: "Use mm:ss format", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("performance_durations").update({ duration_seconds: newSeconds }).eq("id", durationId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    // Update judge_scores with new average
    queryClient.invalidateQueries({ queryKey: ["perf_durations", subEventId] });
    // Recalculate average and push to judge_scores
    const updatedDurations = (durations || []).map(d => d.id === durationId ? { ...d, duration_seconds: newSeconds } : d);
    const contestantDurs = updatedDurations.filter(d => d.contestant_registration_id === selectedContestantId);
    if (contestantDurs.length > 0) {
      const avg = contestantDurs.reduce((sum, d) => sum + Number(d.duration_seconds), 0) / contestantDurs.length;
      await supabase.from("judge_scores")
        .update({ performance_duration_seconds: avg })
        .eq("sub_event_id", subEventId)
        .eq("contestant_registration_id", selectedContestantId);
      queryClient.invalidateQueries({ queryKey: ["judge_scores"] });
    }
    setEditingDurationId(null);
    toast({ title: "Duration updated" });
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

        {/* Contestant grid with pagination */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Contestant on Stage</label>
            <button
              type="button"
              className="text-[11px] text-primary hover:underline flex items-center gap-1"
              onClick={() => setShowReorderModal(true)}
              disabled={running}
            >
              <ListOrdered className="h-3 w-3" /> Edit Order
            </button>
          </div>
          {(() => {
            const totalPages = Math.ceil(contestants.length / gridPageSize);
            const pageContestants = contestants.slice(gridPage * gridPageSize, (gridPage + 1) * gridPageSize);
            return (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 shrink-0"
                    disabled={gridPage === 0}
                    onClick={() => setGridPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1 flex-1 min-w-0">
                    {pageContestants.map((c) => {
                      const realIdx = contestants.indexOf(c);
                      const isTimed = timedContestantIds.has(c.id);
                      const isSelected = selectedContestantId === c.id;
                      return (
                        <div
                          key={c.id}
                          className={cn(
                            "flex flex-col items-center gap-0.5 px-2 py-2 rounded-md border border-transparent transition-all select-none text-center relative",
                            !running && "cursor-pointer",
                            running && !isSelected && "opacity-40 cursor-not-allowed",
                            isSelected && "bg-primary/10 border-primary/30",
                            !running && !isSelected && "hover:bg-muted/30"
                          )}
                          onClick={() => {
                            if (running && !isSelected) return;
                            setSelectedContestantId(isSelected ? "" : c.id);
                          }}
                        >
                          <span className="font-mono text-[10px] text-muted-foreground">{realIdx + 1}</span>
                          <span className="text-xs font-medium text-foreground truncate w-full">{c.full_name}</span>
                          {isSelected && isOnStage && (
                            <Badge className="bg-secondary/20 text-secondary border-secondary/30 text-[9px] px-1 py-0">On Stage</Badge>
                          )}
                          {/* Move after last timed icon */}
                          {!running && !isTimed && timedContestantIds.size > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className="absolute top-0.5 right-0.5 p-0.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveAfterLastTimed(c.id);
                                  }}
                                >
                                  <ArrowDownToLine className="h-3 w-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent><p className="text-xs">Move after last timed</p></TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 shrink-0"
                    disabled={gridPage >= totalPages - 1}
                    onClick={() => setGridPage((p) => Math.min(totalPages - 1, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                {totalPages > 1 && (
                  <p className="text-[10px] text-muted-foreground text-center font-mono">
                    {gridPage + 1} / {totalPages}
                  </p>
                )}
              </div>
            );
          })()}
        </div>

        {selectedContestantId && (
          <>
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

            {/* Editable multi-tabulator durations */}
            {!running && contestantDurations.length > 0 && (
              <div className="space-y-1 px-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Recorded Durations</p>
                {contestantDurations.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-xs font-mono text-muted-foreground gap-2">
                    <span>{tabulatorName(d.tabulator_id)}</span>
                    {editingDurationId === d.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editDurationValue}
                          onChange={(e) => setEditDurationValue(e.target.value)}
                          className="h-6 w-16 text-xs font-mono px-1 text-center"
                          placeholder="mm:ss"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEditDuration(d.id);
                            if (e.key === "Escape") cancelEditDuration();
                          }}
                        />
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => saveEditDuration(d.id)}>
                          <Check className="h-3 w-3 text-secondary" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={cancelEditDuration}>
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={() => startEditDuration(d.id, Number(d.duration_seconds))}
                      >
                        <span>{formatDuration(Number(d.duration_seconds))}</span>
                        <Pencil className="h-3 w-3 opacity-50" />
                      </button>
                    )}
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
      <ContestantReorderModal
        open={showReorderModal}
        onOpenChange={setShowReorderModal}
        contestants={contestants}
        subEventId={subEventId}
        timedContestantIds={timedContestantIds}
      />
    </Card>
  );
}
