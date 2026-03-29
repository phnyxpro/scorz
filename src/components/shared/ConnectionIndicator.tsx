import React, { useState, useEffect, useRef, useCallback } from "react";
import { Wifi, WifiOff, AlertTriangle, CheckCircle, CloudOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type BackendStatus = "healthy" | "degraded" | "offline";

interface ConnectionIndicatorProps {
  pendingCount?: number;
  isOfflineReady?: boolean;
}

export const ConnectionIndicator = React.forwardRef<HTMLSpanElement, ConnectionIndicatorProps>(
  ({ pendingCount = 0, isOfflineReady = false }, outerRef) => {
  const [online, setOnline] = useState(navigator.onLine);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("healthy");
  const consecutiveFailures = useRef(0);
  const checkTimer = useRef<ReturnType<typeof setInterval>>();

  const checkBackend = useCallback(async () => {
    if (!navigator.onLine) {
      setBackendStatus("offline");
      return;
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const { error } = await supabase
        .from("competitions")
        .select("id", { count: "exact", head: true })
        .limit(1)
        .abortSignal(controller.signal);
      clearTimeout(timeout);
      if (error) throw error;
      consecutiveFailures.current = 0;
      setBackendStatus("healthy");
    } catch {
      consecutiveFailures.current += 1;
      setBackendStatus(consecutiveFailures.current >= 2 ? "degraded" : "healthy");
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => { setOnline(true); checkBackend(); };
    const handleOffline = () => { setOnline(false); setBackendStatus("offline"); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    checkBackend();
    checkTimer.current = setInterval(checkBackend, 30_000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(checkTimer.current);
    };
  }, [checkBackend]);

  const status: BackendStatus = !online ? "offline" : backendStatus;

  const icon =
    status === "offline" ? <CloudOff className="h-4 w-4 text-destructive animate-pulse" /> :
    status === "degraded" ? <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" /> :
    isOfflineReady ? <CheckCircle className="h-4 w-4 text-secondary" /> :
    <Wifi className="h-4 w-4 text-secondary" />;

  const label =
    status === "offline"
      ? (isOfflineReady ? "Offline — using cached data" : "Offline — no internet connection")
      : status === "degraded" ? "Backend slow — experiencing timeouts"
      : isOfflineReady ? "Connected — offline data ready"
      : "Connected";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1">
            {icon}
            {pendingCount > 0 && (
              <Badge variant="outline" className="text-[10px] h-4 min-w-4 px-1 border-amber-500/30 text-amber-600">
                {pendingCount}
              </Badge>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
ConnectionIndicator.displayName = "ConnectionIndicator";
