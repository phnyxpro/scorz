import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";
import { useState } from "react";

export function UpdateNotice() {
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // Check for updates every 30 minutes
      if (registration) {
        setInterval(() => registration.update(), 30 * 60 * 1000);
      }
    },
  });

  if (!needRefresh || dismissed) return null;

  return (
    <div className="fixed z-[100] bottom-16 sm:bottom-4 left-2 right-2 sm:left-auto sm:right-4 sm:w-80 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-lg">
        <RefreshCw className="h-5 w-5 shrink-0 text-primary animate-spin-slow" />
        <p className="flex-1 text-sm text-foreground">
          A new version is available.
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => updateServiceWorker(true)}
          >
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => setDismissed(true)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
