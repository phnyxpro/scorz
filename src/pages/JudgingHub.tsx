import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useCompetitions } from "@/hooks/useCompetitions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Users, ChevronRight, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { SideBySideScores } from "@/components/tabulator/SideBySideScores";
import type { JudgeScore } from "@/hooks/useJudgeScores";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

/** Fetch levels + sub-events + assignments + profiles for a competition in one go */
function useJudgingOverview(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["judging_overview", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      // Levels
      const { data: levels, error: le } = await supabase
        .from("competition_levels")
        .select("*")
        .eq("competition_id", competitionId!)
        .order("sort_order");
      if (le) throw le;

      const levelIds = (levels || []).map((l) => l.id);
      if (!levelIds.length) return { levels: [], subEvents: [], assignments: [], profiles: [], registrations: [] };

      // Sub-events for all levels
      const { data: subEvents, error: se } = await supabase
        .from("sub_events")
        .select("*")
        .in("level_id", levelIds)
        .order("event_date");
      if (se) throw se;

      const subEventIds = (subEvents || []).map((s) => s.id);

      // Assignments (judges) for all sub-events
      const { data: assignments, error: ae } = subEventIds.length
        ? await supabase
            .from("sub_event_assignments")
            .select("*")
            .in("sub_event_id", subEventIds)
            .eq("role", "judge" as any)
        : { data: [] as any[], error: null };
      if (ae) throw ae;

      // Registrations (contestants)
      const { data: registrations, error: re } = subEventIds.length
        ? await supabase
            .from("contestant_registrations")
            .select("id, full_name, sub_event_id, status, competition_id, user_id")
            .eq("competition_id", competitionId!)
            .neq("status", "rejected")
        : { data: [] as any[], error: null };
      if (re) throw re;

      // Get unique user_ids from assignments to fetch profile names
      const userIds = [...new Set((assignments || []).map((a: any) => a.user_id))];
      const { data: profiles, error: pe } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds)
        : { data: [] as any[], error: null };
      if (pe) throw pe;

      // Judge scores for all sub-events
      const { data: scores, error: sce } = subEventIds.length
        ? await supabase
            .from("judge_scores")
            .select("*")
            .in("sub_event_id", subEventIds)
        : { data: [] as any[], error: null };
      if (sce) throw sce;

      // Rubric criteria for the competition
      const { data: rubric, error: rce } = await supabase
        .from("rubric_criteria")
        .select("*")
        .eq("competition_id", competitionId!)
        .order("sort_order");
      if (rce) throw rce;

      return {
        levels: levels || [],
        subEvents: subEvents || [],
        assignments: assignments || [],
        profiles: profiles || [],
        registrations: registrations || [],
        scores: (scores || []) as JudgeScore[],
        rubric: rubric || [],
      };
    },
  });
}

export default function JudgingHub() {
  const { data: competitions, isLoading: compsLoading } = useCompetitions();
  const activeComps = useMemo(
    () => (competitions || []).filter((c) => c.status === "active" || c.status === "completed"),
    [competitions]
  );
  const [selectedCompId, setSelectedCompId] = useState("");
  const { data: overview, isLoading: overviewLoading } = useJudgingOverview(selectedCompId || undefined);

  const profileMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of overview?.profiles || []) {
      m.set(p.user_id, p.full_name || p.email || "Unknown");
    }
    return m;
  }, [overview?.profiles]);

  const rubricNames = useMemo(
    () => (overview?.rubric || []).map((r: any) => r.name),
    [overview?.rubric]
  );

  if (compsLoading) return <div className="text-muted-foreground font-mono text-sm animate-pulse">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" /> Judging Hub
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Select a competition to view score sheets and judges per level.
        </p>
      </div>

      {/* Competition selector */}
      <Card className="border-border/50 bg-card/80 mb-6">
        <CardContent className="pt-4">
          <label className="text-xs text-muted-foreground font-medium">Competition</label>
          <Select value={selectedCompId} onValueChange={setSelectedCompId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Choose a competition…" />
            </SelectTrigger>
            <SelectContent>
              {activeComps.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
              {activeComps.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">No active competitions</div>
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Overview */}
      {selectedCompId && overviewLoading && (
        <div className="text-muted-foreground font-mono text-sm animate-pulse">Loading levels…</div>
      )}

      {selectedCompId && overview && (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          {overview.levels.length === 0 ? (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No levels configured for this competition yet.
              </CardContent>
            </Card>
          ) : (
            overview.levels.map((level) => {
              const levelSubEvents = overview.subEvents.filter((se) => se.level_id === level.id);
              return (
                <motion.div key={level.id} variants={item}>
                  <Card className="border-border/50 bg-card/80">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{level.name}</CardTitle>
                      <CardDescription>
                        {levelSubEvents.length} sub-event{levelSubEvents.length !== 1 ? "s" : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {levelSubEvents.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No sub-events yet.</p>
                      ) : (
                        levelSubEvents.map((se) => {
                          const judges = overview.assignments.filter(
                            (a: any) => a.sub_event_id === se.id
                          );
                          const contestants = overview.registrations.filter(
                            (r: any) => r.sub_event_id === se.id
                          );
                          return (
                            <div
                              key={se.id}
                              className="rounded-lg border border-border/40 bg-muted/30 p-4 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm text-foreground">{se.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {se.event_date || "No date"}{" "}
                                    {se.start_time ? `• ${se.start_time}` : ""}
                                  </p>
                                </div>
                                <Badge
                                  className={
                                    se.status === "in_progress"
                                      ? "bg-primary/20 text-primary"
                                      : se.status === "completed"
                                      ? "bg-secondary/20 text-secondary"
                                      : "bg-muted text-muted-foreground"
                                  }
                                >
                                  {se.status}
                                </Badge>
                              </div>

                              {/* Judges */}
                              <div>
                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                                  Judges ({judges.length})
                                </p>
                                {judges.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic">No judges assigned</p>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {judges.map((j: any) => (
                                      <span
                                        key={j.id}
                                        className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                                      >
                                        {profileMap.get(j.user_id) || "Unknown"}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Contestants */}
                              <div>
                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                                  Contestants ({contestants.length})
                                </p>
                                {contestants.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic">No contestants registered</p>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {contestants.map((c: any) => (
                                      <span
                                        key={c.id}
                                        className="text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20"
                                      >
                                        {c.full_name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Per-contestant scorecards */}
                              {contestants.length > 0 && rubricNames.length > 0 && (() => {
                                const seScores = (overview?.scores || []).filter(
                                  (s) => s.sub_event_id === se.id
                                );
                                if (seScores.length === 0) return null;
                                return (
                                  <div className="space-y-3 pt-1">
                                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                                      Scorecards by Judge
                                    </p>
                                    {contestants.map((c: any) => {
                                      const contestantScores = seScores.filter(
                                        (s) => s.contestant_registration_id === c.id
                                      );
                                      if (contestantScores.length === 0) return null;
                                      // Replace judge_id with judge name for display
                                      const enriched = contestantScores.map((s) => ({
                                        ...s,
                                        judge_id: profileMap.get(s.judge_id) || s.judge_id.slice(0, 8) + "…",
                                      }));
                                      return (
                                        <SideBySideScores
                                          key={c.id}
                                          scores={enriched as any}
                                          rubricNames={rubricNames}
                                          contestantName={c.full_name}
                                          contestantUserId={c.user_id}
                                        />
                                      );
                                    })}
                                  </div>
                                );
                              })()}

                              {/* Score sheet link */}
                              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                                <Link to={`/competitions/${selectedCompId}/score?sub_event=${se.id}`}>
                                  <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                                  Open Score Sheet
                                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                </Link>
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </motion.div>
      )}
    </div>
  );
}
