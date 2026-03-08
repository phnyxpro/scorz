import React, { useState, useEffect, useRef, useCallback } from "react";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

type BackendStatus = "healthy" | "degraded" | "offline";

export function ConnectionIndicator() {
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

    // Periodic health check every 30s
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
    status === "offline" ? <WifiOff className="h-4 w-4 text-destructive animate-pulse" /> :
    status === "degraded" ? <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" /> :
    <Wifi className="h-4 w-4 text-secondary" />;

  const label =
    status === "offline" ? "Offline — no internet connection" :
    status === "degraded" ? "Backend slow — experiencing timeouts" :
    "Connected";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center">
            {icon}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
