import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export function ConnectionIndicator() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center">
            {online ? (
              <Wifi className="h-4 w-4 text-secondary" />
            ) : (
              <WifiOff className="h-4 w-4 text-destructive animate-pulse" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{online ? "Connected" : "Offline"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
