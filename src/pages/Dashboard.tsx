import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trophy, Users, ClipboardList, Mic, Shield, BarChart3, Eye,
  CreditCard, BookOpen, ShieldCheck, User, Calendar, DollarSign,
  FileText, ListChecks, LucideIcon, UserPlus, Calculator as CalcIcon, Radio, AlertTriangle, MessageSquare
} from "lucide-react";
import { motion } from "framer-motion";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { dashboardCards, AppRole } from "@/lib/navigation";
import { supabase } from "@/integrations/supabase/client";
import TabulatorDashboard from "@/pages/TabulatorDashboard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ActivityFeed } from "@/components/shared/ActivityFeed";
import { Badge } from "@/components/ui/badge";
import { AdminDashboardCharts } from "@/components/admin/AdminDashboardCharts";
import { AdminAlertsPanel } from "@/components/admin/AdminAlertsPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EventChat } from "@/components/chat/EventChat";
import { useChatUnreadCount } from "@/hooks/useEventChat";

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
  ];
  if (hasChiefAssignments) {
    cards.push({ title: "Certify Results", desc: "Review scores & certify", icon: ShieldCheck, color: "text-secondary", to: `/competitions/${competitionId}/chief-judge` });
  }
  cards.push(
    { title: "Contestant Profiles", desc: "View contestant info & bios", icon: Users, color: "text-secondary", to: `/competitions/${competitionId}/contestants` },
    { title: "Rules", desc: "Official competition rules", icon: FileText, color: "text-secondary", to: `/competitions/${competitionId}/rules` },
    { title: "Penalties", desc: "Deductions & disqualifications", icon: AlertTriangle, color: "text-secondary", to: `/competitions/${competitionId}/penalties` },
    { title: "Rubric", desc: "Scoring criteria & descriptors", icon: BookOpen, color: "text-secondary", to: `/competitions/${competitionId}/rubric` },
  );
  return cards;
}

interface AssignedCompetition {
  id: string;
  name: string;
  hasChiefAssignment: boolean;
}

function useAssignedCompetitions(userId: string | undefined, userEmail: string | undefined, isJudgeRole: boolean) {
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

      let subEventIds: string[] = [];
      let chiefSubEventIds = new Set<string>();

      if (assignments && assignments.length > 0) {
        subEventIds = assignments.map(a => a.sub_event_id);
        chiefSubEventIds = new Set(assignments.filter((a: any) => a.is_chief).map(a => a.sub_event_id));
      } else if (userEmail) {
        // Fall back to pending staff_invitations
        const { data: invites } = await supabase
          .from("staff_invitations")
          .select("id, is_chief, role")
          .ilike("email", userEmail)
          .is("accepted_at", null);

        if (!invites?.length) { setLoading(false); return; }

        const inviteIds = invites.map(i => i.id);

        // Get sub-event mappings from staff_invitation_sub_events
        const { data: invSubEvents } = await supabase
          .from("staff_invitation_sub_events")
          .select("sub_event_id, staff_invitation_id")
          .in("staff_invitation_id", inviteIds);

        if (!invSubEvents?.length) { setLoading(false); return; }

        subEventIds = invSubEvents.map(s => s.sub_event_id);
        const chiefInviteIds = new Set(invites.filter(i => i.is_chief).map(i => i.id));
        chiefSubEventIds = new Set(
          invSubEvents.filter(s => chiefInviteIds.has(s.staff_invitation_id)).map(s => s.sub_event_id)
        );
      }

      if (!subEventIds.length) { setLoading(false); return; }

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
  }, [userId, userEmail, isJudgeRole]);

  return { competitions, loading };
}

const SELECTED_COMP_KEY = "scorz_selected_competition";

export default function Dashboard() {
  const { user, roles, hasRole, masquerade, isMasquerading } = useAuth();
  const effectiveUserId = isMasquerading ? masquerade?.userId : user?.id;
  const effectiveEmail = isMasquerading ? masquerade?.email : user?.email;
  const { stats, loading: statsLoading } = useDashboardStats(effectiveUserId);
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

  const { competitions: assignedComps, loading: compsLoading } = useAssignedCompetitions(effectiveUserId, effectiveEmail, isJudgeRole);

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

  // Fetch active scoring sub-event for selected competition
  const { data: selectedCompData } = useQuery({
    queryKey: ["comp-active-scoring", selectedCompId],
    enabled: !!selectedCompId && isJudgeRole,
    queryFn: async () => {
      const { data } = await supabase
        .from("competitions")
        .select("active_scoring_sub_event_id")
        .eq("id", selectedCompId)
        .single();
      return data;
    },
  });

  // Fetch assigned sub-events with level info for the selected competition
  const { data: assignedSubEvents } = useQuery({
    queryKey: ["judge-assigned-sub-events", effectiveUserId, effectiveEmail, selectedCompId],
    enabled: !!effectiveUserId && !!selectedCompId && isJudgeRole,
    queryFn: async () => {
      // Get assignments for user
      const { data: assignments } = await supabase
        .from("sub_event_assignments")
        .select("sub_event_id")
        .eq("user_id", effectiveUserId!);

      let seIds: string[] = [];

      if (assignments && assignments.length > 0) {
        seIds = assignments.map(a => a.sub_event_id);
      } else if (effectiveEmail) {
        // Fall back to pending invitations
        const { data: invites } = await supabase
          .from("staff_invitations")
          .select("id")
          .ilike("email", effectiveEmail)
          .is("accepted_at", null);

        if (invites?.length) {
          const { data: invSubEvents } = await supabase
            .from("staff_invitation_sub_events")
            .select("sub_event_id")
            .in("staff_invitation_id", invites.map(i => i.id));
          seIds = (invSubEvents || []).map(s => s.sub_event_id);
        }
      }

      if (!seIds.length) return [];

      // Get sub-events with level info
      const { data: subEvents } = await supabase
        .from("sub_events")
        .select("id, name, level_id, competition_levels!inner(id, name, competition_id)")
        .in("id", seIds);

      // Filter to selected competition
      return (subEvents || []).filter(
        (se: any) => se.competition_levels?.competition_id === selectedCompId
      ).map((se: any) => ({
        id: se.id,
        name: se.name,
        levelName: se.competition_levels?.name || "",
      }));
    },
  });

  const activeScoringSubEventId = selectedCompData?.active_scoring_sub_event_id;

  const cards = useMemo(() => {
    if (isJudgeRole && selectedCompId) {
      return buildJudgeCards(selectedCompId, hasChiefForSelected);
    }

    return dashboardCards.filter(card => {
      if (!card.roles) return true;
      return card.roles.some(role => roles.includes(role as AppRole));
    });
  }, [isJudgeRole, hasChiefForSelected, selectedCompId, roles]);

  const [showChatModal, setShowChatModal] = useState(false);
  const unreadCount = useChatUnreadCount(selectedCompId || "");

  return (
    <div>
      {!isTabulator && (
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <ConnectionIndicator />
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Welcome back{isMasquerading && masquerade?.fullName ? `, ${masquerade.fullName}` : user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : user?.email ? `, ${user.email}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
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
      )}

      {isTabulator ? (
        <TabulatorDashboard />
      ) : (
        <>
          {/* Admin platform stats */}
          {isAdmin && stats.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Total Users", value: stats.find(s => s.label === "Users")?.value ?? 0, icon: Users, color: "text-primary" },
                { label: "Competitions", value: stats.find(s => s.label === "Competitions")?.value ?? 0, icon: Trophy, color: "text-primary" },
                { label: "Active Events", value: stats.find(s => s.label === "Active")?.value ?? 0, icon: BarChart3, color: "text-primary" },
                { label: "Registrations", value: stats.find(s => s.label === "Registrations")?.value ?? 0, icon: UserPlus, color: "text-primary" },
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

          {/* Admin trend charts */}
          {isAdmin && <AdminDashboardCharts />}

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
                  <Link key={s.label} to={s.to} className="rounded-lg border border-border/40 bg-card/60 p-3 hover:bg-card/90 hover:border-accent/30 transition-colors cursor-pointer">
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
                    <Card className="border-border/50 bg-card/80 hover:bg-card hover:border-accent/30 transition-colors cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-foreground group-hover:text-accent transition-colors">
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

          {/* Needs Attention alerts for admins */}
          {isAdmin && <AdminAlertsPanel />}

          {/* Activity Feed for admins/organisers */}
          {(isAdmin || hasRole("organizer")) && (
            <div className="mb-6">
              <ActivityFeed />
            </div>
          )}

          {/* Empty state for contestants with no registrations */}
          {hasRole("contestant") && stats.find(s => s.label === "My Registrations")?.value === 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
                <CardContent className="py-10 text-center">
                  <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mic className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Ready to compete?</h3>
                  <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                    You haven't registered for any competitions yet. Browse upcoming events and sign up to showcase your talent.
                  </p>
                   <Link to="/public-events">
                     <Button size="sm" className="gap-2">
                       <Trophy className="h-4 w-4" /> Browse Competitions
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Empty state for audience with no tickets */}
          {hasRole("audience") && !hasRole("contestant") && !hasRole("organizer") && !isAdmin && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <Card className="border-dashed border-2 border-accent/20 bg-accent/5">
                <CardContent className="py-10 text-center">
                  <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center">
                    <Eye className="h-7 w-7 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Find events near you</h3>
                  <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                    Discover live competitions, grab tickets, and vote for your favourite contestants.
                  </p>
                   <Link to="/public-events">
                     <Button variant="outline" size="sm" className="gap-2">
                       <Calendar className="h-4 w-4" /> Explore Events
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Generic empty state for users with no dashboard cards */}
          {cards.length === 0 && !hasRole("contestant") && !hasRole("audience") && !isAdmin && !hasRole("organizer") && !isJudgeRole && !isTabulator && (
            <Card className="border-border/50 bg-card/80 mb-6">
              <CardContent className="py-8 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-1">No active events yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Browse public events to register as a contestant or get audience tickets.
                </p>
                 <Link to="/public-events">
                   <Button variant="outline" size="sm">Browse Events</Button>
                 </Link>
              </CardContent>
            </Card>
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
      {/* Production Chat Modal */}
      <Dialog open={showChatModal} onOpenChange={setShowChatModal}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Production Chat</DialogTitle>
            <DialogDescription>Chat with competition staff</DialogDescription>
          </DialogHeader>
          {selectedCompId && <EventChat competitionId={selectedCompId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
