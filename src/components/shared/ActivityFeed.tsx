import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Shield, Calculator, Mail, Activity, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const eventIcons: Record<string, typeof CheckCircle2> = {
  scores_certified: CheckCircle2,
  chief_certified: Shield,
  tabulator_certified: Calculator,
  witness_certified: Eye,
  notification_sent: Mail,
};

const eventColors: Record<string, string> = {
  scores_certified: "text-green-500",
  chief_certified: "text-primary",
  tabulator_certified: "text-blue-500",
  witness_certified: "text-purple-500",
  notification_sent: "text-amber-500",
};

interface ActivityFeedProps {
  competitionId?: string;
  limit?: number;
}

export function ActivityFeed({ competitionId, limit = 20 }: ActivityFeedProps) {
  const qc = useQueryClient();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["activity-log", competitionId],
    queryFn: async () => {
      let query = supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (competitionId) {
        query = query.eq("competition_id", competitionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription
  useEffect(() => {
    const filter = competitionId
      ? `competition_id=eq.${competitionId}`
      : undefined;

    const channel = supabase
      .channel("activity-log-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_log",
          ...(filter ? { filter } : {}),
        },
        () => qc.invalidateQueries({ queryKey: ["activity-log", competitionId] })
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [competitionId, qc]);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2.5 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-4">No activity yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Recent Activity
          </CardTitle>
          <Badge variant="outline" className="text-[9px]">{logs.length} events</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[320px] pr-2">
          <div className="space-y-3">
            {logs.map((log) => {
              const Icon = eventIcons[log.event_type] || Activity;
              const color = eventColors[log.event_type] || "text-muted-foreground";

              return (
                <div key={log.id} className="flex gap-3 group">
                  <div className={`mt-0.5 shrink-0 h-7 w-7 rounded-full bg-muted/50 flex items-center justify-center ${color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight">{log.title}</p>
                    {log.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{log.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
