import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert, Activity } from "lucide-react";
import { ActivityFeed } from "@/components/shared/ActivityFeed";

export default function AdminLogs() {
  const { hasRole } = useAuth();

  if (!hasRole("admin")) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <ShieldAlert className="h-12 w-12" />
        <p className="font-mono text-sm">Access denied. Admin role required.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Audit Logs
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Realtime activity trail for the entire platform</p>
      </div>

      {/* show a larger feed, default limit helpful but allow fit full list */}
      <ActivityFeed limit={200} />
    </div>
  );
}
