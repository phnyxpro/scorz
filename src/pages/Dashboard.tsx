import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trophy, Users, ClipboardList, Mic, Shield, BarChart3, Eye,
  CreditCard, BookOpen, ShieldCheck, User, Calendar, DollarSign,
  FileText, ListChecks, LucideIcon, UserPlus
} from "lucide-react";
import { motion } from "framer-motion";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { dashboardCards, AppRole } from "@/lib/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { JudgingHubContent } from "@/pages/JudgingHub";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface CardConfig {
  title: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  to: string;
}

function buildJudgeCards(competitionId: string, hasChiefAssignments: boolean): CardConfig[] {
  const cards: CardConfig[] = [
    { title: "Score Cards", desc: "Select contestant & enter scores", icon: ListChecks, color: "text-secondary", to: `/competitions/${competitionId}/score` },
    { title: "Contestant Profiles", desc: "View contestant info & bios", icon: Users, color: "text-secondary", to: `/competitions/${competitionId}/contestants` },
    { title: "Rules", desc: "Official competition rules", icon: FileText, color: "text-secondary", to: `/competitions/${competitionId}/rules` },
    { title: "Rubric", desc: "Scoring criteria & descriptors", icon: BookOpen, color: "text-secondary", to: `/competitions/${competitionId}/rubric` },
  ];
  if (hasChiefAssignments) {
    cards.push({ title: "Certify Results", desc: "Review scores & certify", icon: ShieldCheck, color: "text-secondary", to: `/competitions/${competitionId}/chief-judge` });
  }
  return cards;
}

interface AssignedCompetition {
  id: string;
  name: string;
  hasChiefAssignment: boolean;
}

function useAssignedCompetitions(userId: string | undefined, isJudgeRole: boolean) {
  const [competitions, setCompetitions] = useState<AssignedCompetition[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !isJudgeRole) return;
    setLoading(true);
    (async () => {
      // Get sub-event IDs assigned to user
      const { data: assignments } = await supabase
        .from("sub_event_assignments")
        .select("sub_event_id, is_chief")
        .eq("user_id", userId);

      if (!assignments?.length) { setLoading(false); return; }

      const subEventIds = assignments.map(a => a.sub_event_id);
      const chiefSubEventIds = new Set(assignments.filter((a: any) => a.is_chief).map(a => a.sub_event_id));

      // Get level IDs from sub-events
      const { data: subEvents } = await supabase
        .from("sub_events")
        .select("id, level_id")
        .in("id", subEventIds);

      if (!subEvents?.length) { setLoading(false); return; }

      const levelIds = [...new Set(subEvents.map(se => se.level_id))];

      // Get competition IDs from levels
      const { data: levels } = await supabase
        .from("competition_levels")
        .select("id, competition_id")
        .in("id", levelIds);

      if (!levels?.length) { setLoading(false); return; }

      const compIds = [...new Set(levels.map(l => l.competition_id))];

      // Get competition names
      const { data: comps } = await supabase
        .from("competitions")
        .select("id, name")
        .in("id", compIds);

      // Determine which competitions have chief assignments
      const levelToComp = new Map((levels || []).map(l => [l.id, l.competition_id]));
      const subEventToLevel = new Map((subEvents || []).map(se => [se.id, se.level_id]));
      const compsWithChief = new Set<string>();
      for (const seId of chiefSubEventIds) {
        const levelId = subEventToLevel.get(seId);
        if (levelId) {
          const compId = levelToComp.get(levelId);
          if (compId) compsWithChief.add(compId);
        }
      }

      setCompetitions((comps || []).map(c => ({ ...c, hasChiefAssignment: compsWithChief.has(c.id) })));
      setLoading(false);
    })();
  }, [userId, isJudgeRole]);

  return { competitions, loading };
}

const SELECTED_COMP_KEY = "scorz_selected_competition";

export default function Dashboard() {
  const { user, roles, hasRole } = useAuth();
  const { stats, loading: statsLoading } = useDashboardStats();
  const isAdmin = hasRole("admin");
  const isTabulator = hasRole("tabulator");
  const { data: topCompetitions } = useQuery({
    queryKey: ["top-competitions"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("competitions")
        .select("id, name, status, created_at")
        .in("status", ["active", "draft"])
        .order("created_at", { ascending: false })
        .limit(2);
      return data || [];
    },
  });
  const isJudgeRole = roles.includes("judge");

  const { competitions: assignedComps, loading: compsLoading } = useAssignedCompetitions(user?.id, isJudgeRole);

  const [selectedCompId, setSelectedCompId] = useState(() => localStorage.getItem(SELECTED_COMP_KEY) || "");

  // Auto-select if only one competition
  useEffect(() => {
    if (assignedComps.length === 1 && !selectedCompId) {
      setSelectedCompId(assignedComps[0].id);
    }
  }, [assignedComps, selectedCompId]);

  // Persist selection
  useEffect(() => {
    if (selectedCompId) localStorage.setItem(SELECTED_COMP_KEY, selectedCompId);
  }, [selectedCompId]);

  const selectedComp = assignedComps.find(c => c.id === selectedCompId);
  const hasChiefForSelected = selectedComp?.hasChiefAssignment ?? false;

  const cards = useMemo(() => {
    if (isJudgeRole && selectedCompId) {
      return buildJudgeCards(selectedCompId, hasChiefForSelected);
    }

    return dashboardCards.filter(card => {
      if (!card.roles) return true;
      return card.roles.some(role => roles.includes(role as AppRole));
    });
  }, [isJudgeRole, hasChiefForSelected, selectedCompId, roles]);

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : user?.email ? `, ${user.email}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tabulator Dashboard link */}
          {isTabulator && (
            <Button asChild variant="outline" size="sm">
              <Link to="/tabulator">Tabulator Dashboard</Link>
            </Button>
          )}

          {/* Competition selector for judges */}
          {isJudgeRole && (
            <div className="w-full sm:w-64">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">
                Active Competition
              </label>
              {compsLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : assignedComps.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No competitions assigned</p>
              ) : (
                <Select value={selectedCompId} onValueChange={setSelectedCompId}>
                  <SelectTrigger className="bg-card/80 border-border/50">
                    <SelectValue placeholder="Select competition…" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedComps.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabulator: show Judging Hub content instead of stats/cards */}
      {isTabulator ? (
        <JudgingHubContent />
      ) : (
        <>
          {/* Admin platform stats */}
          {isAdmin && adminStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Total Users", value: adminStats.users, icon: Users, color: "text-primary" },
                { label: "Competitions", value: adminStats.competitions, icon: Trophy, color: "text-primary" },
                { label: "Active Events", value: adminStats.active, icon: BarChart3, color: "text-primary" },
                { label: "Registrations", value: adminStats.registrations, icon: UserPlus, color: "text-primary" },
              ].map((s) => (
                <Card key={s.label} className="border-border/50 bg-card/80">
                  <CardContent className="pt-4 pb-3 flex items-center gap-3">
                    <s.icon className={`h-5 w-5 ${s.color} shrink-0`} />
                    <div>
                      <p className="text-xl font-bold font-mono text-foreground">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Prompt to select competition */}
          {isJudgeRole && !selectedCompId && assignedComps.length > 0 && (
            <Card className="border-primary/30 bg-primary/5 mb-6">
              <CardContent className="py-4 text-center">
                <p className="text-sm text-foreground">Select a competition above to access your scoring tools.</p>
              </CardContent>
            </Card>
          )}

          {/* Quick stats */}
          {stats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 mb-6"
            >
              {statsLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-border/40 bg-card/60 p-3">
                    <Skeleton className="h-3 w-20 mb-2" />
                    <Skeleton className="h-6 w-10" />
                  </div>
                ))
                : stats.map((s) => (
                  <Link key={s.label} to={s.to} className="rounded-lg border border-border/40 bg-card/60 p-3 hover:bg-card/90 hover:border-primary/30 transition-colors cursor-pointer">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-bold text-foreground mt-0.5">{s.value ?? "—"}</p>
                  </Link>
                ))}
            </motion.div>
          )}

          {/* Top Competitions Quick Access */}
          {isAdmin && topCompetitions && topCompetitions.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-3">Quick Access</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {topCompetitions.map((comp) => (
                  <Link key={comp.id} to={`/competitions/${comp.id}`}>
                    <Card className="border-border/50 bg-card/80 hover:bg-card hover:border-primary/30 transition-colors cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                              {comp.name}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 capitalize">
                              {comp.status} • Created {new Date(comp.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Trophy className="h-5 w-5 text-primary/60 group-hover:text-primary transition-colors" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {cards.map((c) => (
              <motion.div key={c.to} variants={item}>
                <Link to={c.to}>
                  <Card className="border-border/50 bg-card/80 hover:bg-card transition-colors cursor-pointer group">
                    <CardHeader className="pb-2">
                      <c.icon className={`h-8 w-8 ${c.color} mb-2 group-hover:scale-110 transition-transform`} />
                      <CardTitle className="text-base">{c.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{c.desc}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}
