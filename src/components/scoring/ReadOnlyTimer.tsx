import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer, User, Radio } from "lucide-react";
import { useLatestTimerEvent, useTimerEventsRealtime } from "@/hooks/usePerformanceTimer";

interface ReadOnlyTimerProps {
  subEventId: string;
  timeLimitSeconds: number;
  gracePeriodSeconds: number;
  contestantName?: (regId: string) => string;
}

export function ReadOnlyTimer({
  subEventId,
  timeLimitSeconds,
  gracePeriodSeconds,
  contestantName,
}: ReadOnlyTimerProps) {
  const { data: latestEvent } = useLatestTimerEvent(subEventId);
  useTimerEventsRealtime(subEventId);

  const [displayElapsed, setDisplayElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const isRunning = latestEvent?.event_type === "start";
  const isOnStage = latestEvent?.event_type === "on_stage" || latestEvent?.event_type === "start";
  const contestantRegId = latestEvent?.contestant_registration_id;
  const name = contestantRegId && contestantName ? contestantName(contestantRegId) : null;

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!latestEvent) {
      setDisplayElapsed(0);
      return;
    }

    if (latestEvent.event_type === "start") {
      const baseElapsed = Number(latestEvent.elapsed_seconds) || 0;
      const eventTime = new Date(latestEvent.created_at).getTime();
      startTimeRef.current = eventTime - baseElapsed * 1000;

      intervalRef.current = setInterval(() => {
        setDisplayElapsed((Date.now() - startTimeRef.current) / 1000);
      }, 100);
    } else if (latestEvent.event_type === "stop") {
      setDisplayElapsed(Number(latestEvent.elapsed_seconds) || 0);
    } else {
      // on_stage or off_stage — reset display
      setDisplayElapsed(0);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [latestEvent?.id, latestEvent?.event_type]);

  if (!latestEvent || latestEvent.event_type === "off_stage") return null;

  const graceStart = timeLimitSeconds;
  const penaltyStart = timeLimitSeconds + gracePeriodSeconds;

  let zoneClass = "text-foreground";
  let bgClass = "bg-card/80";
  if (displayElapsed > penaltyStart) {
    zoneClass = "text-destructive";
    bgClass = "bg-destructive/10";
  } else if (displayElapsed > graceStart) {
    zoneClass = "text-primary";
    bgClass = "bg-primary/10";
  }

  const mins = Math.floor(displayElapsed / 60);
  const secs = Math.floor(displayElapsed % 60);
  const tenths = Math.floor((displayElapsed * 10) % 10);

  return (
    <Card className={`border-border/50 ${bgClass} transition-colors duration-300`}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Timer className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Performance Timer</span>
          <Badge variant="outline" className="ml-auto text-[9px]">Read-only</Badge>
        </div>

        {name && (
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge variant="secondary" className="gap-1">
              <User className="h-3 w-3" />
              {name}
            </Badge>
            {isOnStage && !isRunning && (
              <Badge variant="outline" className="gap-1 border-secondary/50 text-secondary text-[10px]">
                <Radio className="h-2.5 w-2.5" />
                On Stage
              </Badge>
            )}
            {isRunning && (
              <Badge variant="default" className="gap-1 bg-destructive/20 text-destructive border border-destructive/30">
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                LIVE
              </Badge>
            )}
          </div>
        )}

        <div className="flex flex-col items-center py-4">
          <div className={`font-mono text-4xl font-bold tracking-wider ${zoneClass} transition-colors duration-300`}>
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            <span className="text-xl opacity-60">.{tenths}</span>
          </div>

          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground font-mono">
            <span>Limit: {Math.floor(timeLimitSeconds / 60)}:{String(timeLimitSeconds % 60).padStart(2, "0")}</span>
            <span>·</span>
            <span>Grace: {gracePeriodSeconds}s</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
