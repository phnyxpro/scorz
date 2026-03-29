import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";

interface DayBucket {
  date: string;
  label: string;
  registrations: number;
  scores: number;
}

function useTrendData() {
  return useQuery({
    queryKey: ["admin-dashboard-trends"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const now = new Date();
      const thirtyDaysAgo = subDays(startOfDay(now), 29).toISOString();

      const [regsRes, scoresRes] = await Promise.all([
        supabase
          .from("contestant_registrations")
          .select("created_at")
          .gte("created_at", thirtyDaysAgo)
          .order("created_at", { ascending: true }),
        supabase
          .from("judge_scores")
          .select("created_at")
          .gte("created_at", thirtyDaysAgo)
          .order("created_at", { ascending: true }),
      ]);

      // Build 30-day bucket map
      const buckets = new Map<string, DayBucket>();
      for (let i = 0; i < 30; i++) {
        const d = subDays(startOfDay(now), 29 - i);
        const key = format(d, "yyyy-MM-dd");
        buckets.set(key, {
          date: key,
          label: format(d, "MMM d"),
          registrations: 0,
          scores: 0,
        });
      }

      (regsRes.data || []).forEach((r) => {
        const key = r.created_at.substring(0, 10);
        const bucket = buckets.get(key);
        if (bucket) bucket.registrations++;
      });

      (scoresRes.data || []).forEach((s) => {
        const key = s.created_at.substring(0, 10);
        const bucket = buckets.get(key);
        if (bucket) bucket.scores++;
      });

      return Array.from(buckets.values());
    },
  });
}

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

export function AdminDashboardCharts() {
  const { data: trends, isLoading } = useTrendData();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="pt-6"><Skeleton className="h-[180px] w-full" /></CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="pt-6"><Skeleton className="h-[180px] w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  const hasRegs = trends?.some((t) => t.registrations > 0);
  const hasScores = trends?.some((t) => t.scores > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {/* Registration Trends */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Registrations — Last 30 Days
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          {hasRegs ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trends} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                  interval="preserveStartEnd"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="registrations"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#regGrad)"
                  name="Registrations"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground text-xs py-16">No registrations in the last 30 days</p>
          )}
        </CardContent>
      </Card>

      {/* Scoring Activity */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Scoring Activity — Last 30 Days
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          {hasScores ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={trends} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                  interval="preserveStartEnd"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="scores"
                  fill="hsl(var(--secondary))"
                  radius={[3, 3, 0, 0]}
                  name="Scores Submitted"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground text-xs py-16">No scoring activity in the last 30 days</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
