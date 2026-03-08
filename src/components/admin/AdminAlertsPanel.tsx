import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, UserPlus, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

interface AlertItem {
  label: string;
  count: number;
  icon: typeof AlertTriangle;
  color: string;
  to: string;
}

export function AdminAlertsPanel() {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: async () => {
      const [
        { count: pendingRegs },
        { count: uncertifiedSubEvents },
      ] = await Promise.all([
        supabase
          .from("contestant_registrations")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("sub_events")
          .select("id", { count: "exact", head: true })
          .eq("status", "scoring"),
      ]);

      const items: AlertItem[] = [];

      if ((pendingRegs || 0) > 0) {
        items.push({
          label: "Pending Registrations",
          count: pendingRegs || 0,
          icon: UserPlus,
          color: "text-amber-500",
          to: "/registrations",
        });
      }

      if ((uncertifiedSubEvents || 0) > 0) {
        items.push({
          label: "Events in Scoring",
          count: uncertifiedSubEvents || 0,
          icon: Clock,
          color: "text-blue-500",
          to: "/competitions",
        });
      }

      return items;
    },
    refetchInterval: 30000,
  });

  if (isLoading || !alerts || alerts.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5" /> Needs Attention
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {alerts.map((alert) => (
          <Link key={alert.label} to={alert.to}>
            <Card className="border-border/50 bg-card/80 hover:bg-card hover:border-accent/30 transition-colors cursor-pointer group">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-full bg-muted/50 flex items-center justify-center shrink-0 ${alert.color}`}>
                  <alert.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{alert.label}</p>
                </div>
                <Badge variant="secondary" className="text-xs font-mono shrink-0">
                  {alert.count}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
