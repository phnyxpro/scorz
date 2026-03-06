import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Users, Trophy, TrendingUp, Clock, Star } from "lucide-react";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted-foreground))"];

function useAnalyticsData(competitionId: string | null) {
  return useQuery({
    queryKey: ["analytics", competitionId],
    enabled: true,
    queryFn: async () => {
      // Get all competitions for the user
      const { data: comps } = await supabase
        .from("competitions")
        .select("id, name, status, created_at, start_date, end_date")
        .order("created_at", { ascending: false });

      const competitions = comps || [];
      const targetIds = competitionId ? [competitionId] : competitions.map(c => c.id);

      if (targetIds.length === 0) return { competitions, registrations: [], scores: [], subEvents: [], statusBreakdown: [] };

      // Registrations
      const { data: regs } = await supabase
        .from("contestant_registrations")
        .select("id, status, created_at, competition_id, age_category")
        .in("competition_id", targetIds);

      // Scores
      const { data: scores } = await supabase
        .from("judge_scores")
        .select("id, final_score, raw_total, time_penalty, is_certified, created_at, sub_event_id")
        .limit(1000);

      // Sub events
      const { data: subEvents } = await supabase
        .from("sub_events")
        .select("id, name, status, event_date, level_id")
        .limit(500);

      // Status breakdown
      const statusMap: Record<string, number> = {};
      (regs || []).forEach(r => {
        statusMap[r.status] = (statusMap[r.status] || 0) + 1;
      });
      const statusBreakdown = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

      // Registrations over time (by week)
      const regsByWeek: Record<string, number> = {};
      (regs || []).forEach(r => {
        const week = r.created_at.substring(0, 10);
        regsByWeek[week] = (regsByWeek[week] || 0) + 1;
      });
      const regTimeline = Object.entries(regsByWeek)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-30)
        .map(([date, count]) => ({ date, count }));

      // Score distribution
      const scoreBuckets: Record<string, number> = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
      (scores || []).forEach(s => {
        const pct = s.final_score;
        if (pct <= 20) scoreBuckets["0-20"]++;
        else if (pct <= 40) scoreBuckets["21-40"]++;
        else if (pct <= 60) scoreBuckets["41-60"]++;
        else if (pct <= 80) scoreBuckets["61-80"]++;
        else scoreBuckets["81-100"]++;
      });
      const scoreDistribution = Object.entries(scoreBuckets).map(([range, count]) => ({ range, count }));

      // Age category breakdown
      const ageMap: Record<string, number> = {};
      (regs || []).forEach(r => {
        const cat = r.age_category || "Unknown";
        ageMap[cat] = (ageMap[cat] || 0) + 1;
      });
      const ageCategoryBreakdown = Object.entries(ageMap).map(([name, value]) => ({ name, value }));

      const avgScore = scores && scores.length > 0
        ? (scores.reduce((a, s) => a + Number(s.final_score), 0) / scores.length).toFixed(1)
        : "N/A";

      const certifiedPct = scores && scores.length > 0
        ? Math.round((scores.filter(s => s.is_certified).length / scores.length) * 100)
        : 0;

      return {
        competitions,
        totalRegistrations: (regs || []).length,
        totalScores: (scores || []).length,
        avgScore,
        certifiedPct,
        statusBreakdown,
        regTimeline,
        scoreDistribution,
        ageCategoryBreakdown,
        totalSubEvents: (subEvents || []).length,
      };
    },
  });
}

export default function AnalyticsDashboard() {
  const { hasRole } = useAuth();
  const [selectedComp, setSelectedComp] = useState<string | null>(null);
  const { data, isLoading } = useAnalyticsData(selectedComp);

  if (!hasRole("admin") && !hasRole("organizer")) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <BarChart3 className="h-12 w-12" />
        <p className="font-mono text-sm">Access denied. Admin or Organizer role required.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Advanced Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Scoring trends, participation stats, and performance breakdowns</p>
        </div>
        <Select value={selectedComp || "all"} onValueChange={v => setSelectedComp(v === "all" ? null : v)}>
          <SelectTrigger className="w-60">
            <SelectValue placeholder="All Competitions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Competitions</SelectItem>
            {data?.competitions?.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-center py-12 font-mono animate-pulse">Loading analytics…</div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Registrations", value: data?.totalRegistrations ?? 0, icon: Users, color: "text-primary" },
              { label: "Total Scores", value: data?.totalScores ?? 0, icon: Star, color: "text-secondary" },
              { label: "Avg Score", value: data?.avgScore ?? "N/A", icon: TrendingUp, color: "text-accent" },
              { label: "Certified %", value: `${data?.certifiedPct ?? 0}%`, icon: Trophy, color: "text-primary" },
            ].map(kpi => (
              <Card key={kpi.label} className="border-border/50 bg-card/80">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">{kpi.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Registration Timeline */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono">Registration Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.regTimeline && data.regTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data.regTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground text-xs py-8">No registration data yet</p>
                )}
              </CardContent>
            </Card>

            {/* Score Distribution */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono">Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.scoreDistribution && data.scoreDistribution.some(s => s.count > 0) ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.scoreDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="range" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground text-xs py-8">No scoring data yet</p>
                )}
              </CardContent>
            </Card>

            {/* Registration Status Pie */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono">Registration Status</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.statusBreakdown && data.statusBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={data.statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                        {data.statusBreakdown.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground text-xs py-8">No data yet</p>
                )}
              </CardContent>
            </Card>

            {/* Age Category Breakdown */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono">Age Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.ageCategoryBreakdown && data.ageCategoryBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.ageCategoryBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={80} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground text-xs py-8">No data yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
