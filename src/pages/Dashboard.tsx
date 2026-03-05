import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trophy, Users, ClipboardList, Mic, Shield, BarChart3, Eye,
  CreditCard, BookOpen, ShieldCheck, User, Calendar, DollarSign,
  FileText, ListChecks, LucideIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { dashboardCards, AppRole } from "@/lib/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    { title: "Score Cards", desc: "Select contestant & enter scores", icon: ListChecks, color: "text-primary", to: `/competitions/${competitionId}/score` },
    { title: "Contestant Profiles", desc: "View contestant info & bios", icon: Users, color: "text-secondary", to: `/competitions/${competitionId}/contestants` },
    { title: "Rules", desc: "Official competition rules", icon: FileText, color: "text-primary", to: `/competitions/${competitionId}/rules` },
    { title: "Rubric", desc: "Scoring criteria & descriptors", icon: BookOpen, color: "text-secondary", to: `/competitions/${competitionId}/rubric` },
  ];
  if (hasChiefAssignments) {
    cards.push({ title: "Certify Results", desc: "Review scores & certify", icon: ShieldCheck, color: "text-primary", to: `/competitions/${competitionId}/chief-judge` });
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
        .select("sub_event_id")
        .eq("user_id", userId);

      if (!assignments?.length) { setLoading(false); return; }

      const subEventIds = assignments.map(a => a.sub_event_id);

      // Get level IDs from sub-events
      const { data: subEvents } = await supabase
        .from("sub_events")
        .select("level_id")
        .in("id", subEventIds);

      if (!subEvents?.length) { setLoading(false); return; }

      const levelIds = [...new Set(subEvents.map(se => se.level_id))];

      // Get competition IDs from levels
      const { data: levels } = await supabase
        .from("competition_levels")
        .select("competition_id")
        .in("id", levelIds);

      if (!levels?.length) { setLoading(false); return; }

      const compIds = [...new Set(levels.map(l => l.competition_id))];

      // Get competition names
      const { data: comps } = await supabase
        .from("competitions")
        .select("id, name")
        .in("id", compIds);

      setCompetitions(comps || []);
      setLoading(false);
    })();
  }, [userId, isJudgeRole]);

  return { competitions, loading };
}

const SELECTED_COMP_KEY = "scorz_selected_competition";

export default function Dashboard() {
  const { user, roles } = useAuth();
  const { stats, loading: statsLoading } = useDashboardStats();

  const isJudgeRole = roles.includes("judge");
  const isChief = false; // Chief status is now per-sub-event assignment, resolved contextually

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

  const cards = useMemo(() => {
    // If user is a judge and has a competition selected, show judge-specific cards first
    if (isJudgeRole && selectedCompId) {
      return buildJudgeCards(selectedCompId, isChief);
    }

    // Otherwise, filter from centralized dashboardCards
    return dashboardCards.filter(card => {
      if (!card.roles) return true;
      return card.roles.some(role => roles.includes(role as AppRole));
    });
  }, [isJudgeRole, isChief, selectedCompId, roles]);

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : user?.email ? `, ${user.email}` : ""}
          </p>
        </div>

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
          className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-6"
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
    </div>
  );
}
