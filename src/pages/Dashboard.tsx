import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
<<<<<<< HEAD
=======
import {
  Trophy, Users, ClipboardList, Mic, Shield, BarChart3, Eye,
  CreditCard, BookOpen, ShieldCheck, User, Calendar, DollarSign,
  FileText, ListChecks,
} from "lucide-react";
>>>>>>> 8e5e8026b13e9d80ab4c046779c02f5d95e64c8b
import { motion } from "framer-motion";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
<<<<<<< HEAD
import { dashboardCards } from "@/lib/navigation";
import { useMemo } from "react";
=======
import { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
>>>>>>> 8e5e8026b13e9d80ab4c046779c02f5d95e64c8b

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

<<<<<<< HEAD
  const visibleCards = useMemo(() => {
    return dashboardCards.filter(card => {
      if (!card.roles) return true;
      return card.roles.some(role => roles.includes(role));
    });
  }, [roles]);
=======
const ROLE_CARDS: Record<string, CardConfig[]> = {
  admin: [
    { title: "Admin Panel", desc: "Manage users, settings & billing", icon: Shield, color: "text-primary", to: "/admin" },
    { title: "Platform Analytics", desc: "View metrics across all events", icon: BarChart3, color: "text-secondary", to: "/admin?tab=analytics" },
    { title: "All Competitions", desc: "Browse all hosted competitions", icon: Trophy, color: "text-primary", to: "/competitions" },
    { title: "Support Mode", desc: "Masquerade as an organiser", icon: Eye, color: "text-secondary", to: "/admin?tab=support" },
  ],
  organizer: [
    { title: "My Competitions", desc: "Manage your events & stages", icon: Trophy, color: "text-primary", to: "/competitions" },
    { title: "Judging Hub", desc: "Monitor all scoring", icon: ClipboardList, color: "text-secondary", to: "/judging" },
    { title: "Contestants", desc: "Registrations & profiles", icon: Users, color: "text-primary", to: "/profile" },
    { title: "Payments", desc: "View ticket sales & revenue", icon: CreditCard, color: "text-secondary", to: "/competitions?tab=payments" },
    { title: "People's Choice", desc: "Audience voting", icon: Mic, color: "text-primary", to: "/competitions?tab=voting" },
  ],
  tabulator: [
    { title: "Tabulator Dashboard", desc: "Verify scores & witness results", icon: BarChart3, color: "text-primary", to: "/tabulator" },
    { title: "Judging Hub", desc: "Monitor scoring progress", icon: ClipboardList, color: "text-secondary", to: "/judging" },
  ],
  witness: [
    { title: "Tabulator Dashboard", desc: "Verify scores & witness results", icon: BarChart3, color: "text-primary", to: "/tabulator" },
    { title: "Judging Hub", desc: "Monitor scoring progress", icon: ClipboardList, color: "text-secondary", to: "/judging" },
  ],
  contestant: [
    { title: "My Profile", desc: "View registration & profile", icon: User, color: "text-primary", to: "/profile" },
    { title: "Public Events", desc: "Browse competitions", icon: Calendar, color: "text-secondary", to: "/public-events" },
  ],
  audience: [
    { title: "Public Events", desc: "Browse competitions", icon: Calendar, color: "text-primary", to: "/public-events" },
    { title: "People's Choice", desc: "Cast your votes", icon: Mic, color: "text-secondary", to: "/competitions?tab=voting" },
  ],
};

const FALLBACK_CARDS: CardConfig[] = [
  { title: "Public Events", desc: "Browse competitions", icon: Calendar, color: "text-primary", to: "/public-events" },
  { title: "Pricing", desc: "View plans & get started", icon: DollarSign, color: "text-secondary", to: "/pricing" },
];

function buildJudgeCards(competitionId: string, isChief: boolean): CardConfig[] {
  const cards: CardConfig[] = [
    { title: "Score Cards", desc: "Select contestant & enter scores", icon: ListChecks, color: "text-primary", to: `/competitions/${competitionId}/score` },
    { title: "Contestant Profiles", desc: "View contestant info & bios", icon: Users, color: "text-secondary", to: `/competitions/${competitionId}/contestants` },
    { title: "Rules", desc: "Official competition rules", icon: FileText, color: "text-primary", to: `/competitions/${competitionId}/rules-rubric#rules` },
    { title: "Rubric", desc: "Scoring criteria & descriptors", icon: BookOpen, color: "text-secondary", to: `/competitions/${competitionId}/rules-rubric#rubric` },
  ];
  if (isChief) {
    cards.push({ title: "Certify Results", desc: "Review scores & certify", icon: ShieldCheck, color: "text-primary", to: `/competitions/${competitionId}/chief-judge` });
  }
  return cards;
}

function buildCards(roles: string[]): CardConfig[] {
  if (roles.length === 0) return FALLBACK_CARDS;
  const seen = new Set<string>();
  const result: CardConfig[] = [];
  for (const role of roles) {
    if (role === "judge" || role === "chief_judge") continue; // handled separately
    for (const card of ROLE_CARDS[role] ?? []) {
      if (!seen.has(card.to)) {
        seen.add(card.to);
        result.push(card);
      }
    }
  }
  return result.length ? result : FALLBACK_CARDS;
}

interface AssignedCompetition {
  id: string;
  name: string;
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

  const isJudgeRole = roles.includes("judge") || roles.includes("chief_judge");
  const isChief = roles.includes("chief_judge");

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

  // Build cards: for judge roles use dynamic competition-specific cards
  const cards = useMemo(() => {
    if (isJudgeRole && selectedCompId) {
      return buildJudgeCards(selectedCompId, isChief);
    }
    // For non-judge roles, or judge without selection, use standard cards
    // But still include standard cards for other roles the user may have
    const nonJudgeRoles = roles.filter(r => r !== "judge" && r !== "chief_judge");
    if (isJudgeRole && !selectedCompId) {
      // Show generic cards from other roles, or fallback
      return nonJudgeRoles.length > 0 ? buildCards(nonJudgeRoles) : FALLBACK_CARDS;
    }
    return buildCards(roles);
  }, [isJudgeRole, isChief, selectedCompId, roles]);
>>>>>>> 8e5e8026b13e9d80ab4c046779c02f5d95e64c8b

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
<<<<<<< HEAD
        {visibleCards.map((c) => (
          <motion.div key={c.title} variants={item}>
=======
        {cards.map((c) => (
          <motion.div key={c.to} variants={item}>
>>>>>>> 8e5e8026b13e9d80ab4c046779c02f5d95e64c8b
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
