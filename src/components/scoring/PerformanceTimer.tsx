import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

interface PerformanceTimerProps {
  timeLimitSeconds: number;
  gracePeriodSeconds: number;
  onDurationChange: (seconds: number) => void;
  disabled?: boolean;
}

export function PerformanceTimer({
  timeLimitSeconds,
  gracePeriodSeconds,
  onDurationChange,
  disabled = false,
}: PerformanceTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const onDurationChangeRef = useRef(onDurationChange);
  const elapsedRef = useRef(elapsed);

  // Keep refs current
  onDurationChangeRef.current = onDurationChange;
  elapsedRef.current = elapsed;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    setRunning(false);
  }, [clearTimer]);

  const start = useCallback(() => {
    if (intervalRef.current) return; // already running
    startTimeRef.current = Date.now() - elapsedRef.current * 1000;
    intervalRef.current = setInterval(() => {
      const secs = (Date.now() - startTimeRef.current) / 1000;
      setElapsed(secs);
      onDurationChangeRef.current(secs);
    }, 50);
    setRunning(true);
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setRunning(false);
    setElapsed(0);
    onDurationChangeRef.current(0);
  }, [clearTimer]);

  // Report duration when stopped
  useEffect(() => {
    if (!running) {
      onDurationChangeRef.current(elapsed);
    }
  }, [running, elapsed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // Spacebar shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.code === "Space") {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          if (intervalRef.current) {
            stop();
          } else {
            start();
          }
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [start, stop, disabled]);

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

  return (
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
            <Button onClick={start} disabled={disabled} size="sm" variant="default">
              <Play className="h-4 w-4 mr-1" /> {elapsed > 0 ? "Resume" : "Start"}
            </Button>
          ) : (
            <Button onClick={stop} size="sm" variant="secondary">
              <Pause className="h-4 w-4 mr-1" /> Stop
            </Button>
          )}
          <Button onClick={reset} disabled={running || disabled} size="sm" variant="outline">
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
