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

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  }, []);

  const start = useCallback(() => {
    startTimeRef.current = Date.now() - elapsed * 1000;
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const secs = (now - startTimeRef.current) / 1000;
      setElapsed(secs);
    }, 50);
    setRunning(true);
  }, [elapsed]);

  const reset = useCallback(() => {
    stop();
    setElapsed(0);
    onDurationChange(0);
  }, [stop, onDurationChange]);

  // Report duration changes continuously
  useEffect(() => {
    onDurationChange(elapsed);
  }, [elapsed, onDurationChange]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.code === "Space") {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          if (running) stop();
          else start();
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, start, stop, disabled]);

  const graceStart = timeLimitSeconds;
  const penaltyStart = timeLimitSeconds + gracePeriodSeconds;

  // Color zones
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
