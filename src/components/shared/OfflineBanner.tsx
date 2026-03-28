import { useState, useEffect } from "react";
import { Wifi, WifiOff, CheckCircle, RefreshCw, AlertTriangle, Download, CloudOff } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OfflineBannerProps {
  isSyncing: boolean;
  syncProgress: { done: number; total: number };
  lastSyncedAt: number | null;
  isReady: boolean;
  pendingCount: number;
  isFlushing: boolean;
  flushErrors: string[];
  onRetry: () => void;
}

export function OfflineBanner({
  isSyncing,
  syncProgress,
  lastSyncedAt,
  isReady,
  pendingCount,
  isFlushing,
  flushErrors,
  onRetry,
}: OfflineBannerProps) {
  const [online, setOnline] = useState(navigator.onLine);
  const [showReady, setShowReady] = useState(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Show "Ready for offline" briefly after sync completes
  useEffect(() => {
    if (isReady && !isSyncing && lastSyncedAt && online) {
      setShowReady(true);
      const t = setTimeout(() => setShowReady(false), 4000);
      return () => clearTimeout(t);
    }
  }, [isReady, isSyncing, lastSyncedAt, online]);

  // Syncing data
  if (isSyncing) {
    const pct = syncProgress.total > 0 ? Math.round((syncProgress.done / syncProgress.total) * 100) : 0;
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-foreground mb-3">
        <Download className="h-3.5 w-3.5 text-primary animate-pulse shrink-0" />
        <span className="flex-1">Downloading data for offline use… {syncProgress.done}/{syncProgress.total}</span>
        <Progress value={pct} className="w-20 h-1.5" />
      </div>
    );
  }

  // Flushing queued mutations
  if (isFlushing) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-foreground mb-3">
        <RefreshCw className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
        <span>Back online — syncing offline changes…</span>
      </div>
    );
  }

  // Sync errors
  if (flushErrors.length > 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-foreground mb-3">
        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
        <span className="flex-1">{flushErrors.length} change(s) failed to sync</span>
        <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={onRetry}>
          <RefreshCw className="h-3 w-3 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  // Offline with pending changes
  if (!online) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-foreground mb-3">
        <CloudOff className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <span className="flex-1">
          You're offline — changes saved locally
          {pendingCount > 0 && (
            <Badge variant="outline" className="ml-2 text-[10px] h-4 px-1.5 border-amber-500/30 text-amber-600">
              {pendingCount} pending
            </Badge>
          )}
        </span>
        {isReady && <CheckCircle className="h-3.5 w-3.5 text-secondary shrink-0" />}
      </div>
    );
  }

  // Just synced — ready for offline
  if (showReady) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/10 border border-secondary/20 text-xs text-foreground mb-3 animate-in fade-in duration-300">
        <CheckCircle className="h-3.5 w-3.5 text-secondary shrink-0" />
        <span>Ready for offline use</span>
      </div>
    );
  }

  // Online with pending count badge (compact)
  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-foreground mb-3">
        <RefreshCw className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <span>{pendingCount} offline change(s) waiting to sync</span>
      </div>
    );
  }

  return null;
}
