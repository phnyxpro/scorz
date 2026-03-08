import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2, Shield, Calculator, Mail, Activity, Eye,
  UserPlus, LogIn, AlertTriangle, Trophy, Clock, Vote, Settings
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const eventIcons: Record<string, typeof CheckCircle2> = {
  scores_certified: CheckCircle2,
  chief_certified: Shield,
  tabulator_certified: Calculator,
  witness_certified: Eye,
  notification_sent: Mail,
  registration_created: UserPlus,
  registration_approved: CheckCircle2,
  registration_rejected: AlertTriangle,
  staff_login: LogIn,
  competition_created: Trophy,
  competition_updated: Settings,
  scoring_started: Clock,
  vote_cast: Vote,
};

const eventColors: Record<string, string> = {
  scores_certified: "text-green-500",
  chief_certified: "text-primary",
  tabulator_certified: "text-blue-500",
  witness_certified: "text-purple-500",
  notification_sent: "text-amber-500",
  registration_created: "text-emerald-500",
  registration_approved: "text-green-600",
  registration_rejected: "text-destructive",
  staff_login: "text-muted-foreground",
  competition_created: "text-primary",
  competition_updated: "text-muted-foreground",
  scoring_started: "text-blue-400",
  vote_cast: "text-amber-400",
};

export interface ActivityFeedFilters {
  eventType?: string;
  searchQuery?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface ActivityFeedProps {
  competitionId?: string;
  limit?: number;
  page?: number;
  filters?: ActivityFeedFilters;
}

export function ActivityFeed({ competitionId, limit = 20, page = 1, filters }: ActivityFeedProps) {
  const qc = useQueryClient();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["activity-log", competitionId, limit, page, filters],
    queryFn: async () => {
      let query = supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (competitionId) {
        query = query.eq("competition_id", competitionId);
      }

      if (filters?.eventType) {
        query = query.eq("event_type", filters.eventType);
      }

      if (filters?.searchQuery) {
        query = query.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
      }

      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom.toISOString());
      }

      if (filters?.dateTo) {
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
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
        () => qc.invalidateQueries({ queryKey: ["activity-log"] })
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
        <ScrollArea className="max-h-[500px] pr-2">
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
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-muted-foreground/70 font-mono">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </p>
                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">
                        {log.event_type.replace(/_/g, " ")}
                      </Badge>
                    </div>
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
