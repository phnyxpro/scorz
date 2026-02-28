import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useCompetitions } from "@/hooks/useCompetitions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardList, ChevronRight, ChevronDown, Trophy, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
      const { data: levels, error: le } = await supabase
        .from("competition_levels")
        .select("*")
        .eq("competition_id", competitionId!)
        .order("sort_order");
      if (le) throw le;

      const levelIds = (levels || []).map((l) => l.id);
      if (!levelIds.length) return { levels: [], subEvents: [], assignments: [], profiles: [], registrations: [], scores: [] as JudgeScore[], rubric: [] };

      const { data: subEvents, error: se } = await supabase
        .from("sub_events")
        .select("*")
        .in("level_id", levelIds)
        .order("event_date");
      if (se) throw se;

      const subEventIds = (subEvents || []).map((s) => s.id);

      const { data: assignments, error: ae } = subEventIds.length
        ? await supabase
            .from("sub_event_assignments")
            .select("*")
            .in("sub_event_id", subEventIds)
            .eq("role", "judge" as any)
        : { data: [] as any[], error: null };
      if (ae) throw ae;

      const { data: registrations, error: re } = subEventIds.length
        ? await supabase
            .from("contestant_registrations")
            .select("id, full_name, sub_event_id, status, competition_id, user_id")
            .eq("competition_id", competitionId!)
            .neq("status", "rejected")
        : { data: [] as any[], error: null };
      if (re) throw re;

      const userIds = [...new Set((assignments || []).map((a: any) => a.user_id))];
      const { data: profiles, error: pe } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds)
        : { data: [] as any[], error: null };
      if (pe) throw pe;

      const { data: scores, error: sce } = subEventIds.length
        ? await supabase.from("judge_scores").select("*").in("sub_event_id", subEventIds)
        : { data: [] as any[], error: null };
      if (sce) throw sce;

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
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedContestant, setExpandedContestant] = useState<string | null>(null);

  const { data: overview, isLoading: overviewLoading } = useJudgingOverview(selectedCompId || undefined);

  const filteredComps = useMemo(() => {
    if (!searchQuery.trim()) return activeComps;
    const q = searchQuery.toLowerCase();
    return activeComps.filter((c) => c.name.toLowerCase().includes(q));
  }, [activeComps, searchQuery]);

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

      {/* Competition table with search */}
      <Card className="border-border/50 bg-card/80 mb-6">
        <CardContent className="pt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search competitions…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {filteredComps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No competitions found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competition</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Start</TableHead>
                    <TableHead className="text-center">End</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComps.map((c) => (
                    <TableRow
                      key={c.id}
                      className={`cursor-pointer transition-colors ${selectedCompId === c.id ? "bg-primary/10" : ""}`}
                      onClick={() => setSelectedCompId(c.id)}
                    >
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">{c.start_date || "—"}</TableCell>
                      <TableCell className="text-center font-mono text-xs">{c.end_date || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overview with tabbed levels */}
      {selectedCompId && overviewLoading && (
        <div className="text-muted-foreground font-mono text-sm animate-pulse">Loading levels…</div>
      )}

      {selectedCompId && overview && (
        <>
          {overview.levels.length === 0 ? (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No levels configured for this competition yet.
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue={overview.levels[0]?.id} className="w-full">
              <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                {overview.levels.map((level) => (
                  <TabsTrigger key={level.id} value={level.id} className="text-xs sm:text-sm flex-1 min-w-[80px]">
                    {level.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {overview.levels.map((level) => {
                const levelSubEvents = overview.subEvents.filter((se) => se.level_id === level.id);
                return (
                  <TabsContent key={level.id} value={level.id}>
                    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 mt-4">
                      {levelSubEvents.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No sub-events yet.</p>
                      ) : (
                        levelSubEvents.map((se) => {
                          const judges = overview.assignments.filter((a: any) => a.sub_event_id === se.id);
                          const contestants = overview.registrations.filter((r: any) => r.sub_event_id === se.id);
                          const seScores = (overview.scores || []).filter((s) => s.sub_event_id === se.id);

                          return (
                            <motion.div key={se.id} variants={item}>
                              <Card className="border-border/40 bg-card/80">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <CardTitle className="text-sm">{se.name}</CardTitle>
                                      <CardDescription className="font-mono text-xs">
                                        {se.event_date || "No date"} {se.start_time ? `• ${se.start_time}` : ""}
                                      </CardDescription>
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
                                </CardHeader>
                                <CardContent className="space-y-4">
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

                                  {/* Contestants table – click to expand scorecard */}
                                  <div>
                                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                                      Contestants ({contestants.length})
                                    </p>
                                    {contestants.length === 0 ? (
                                      <p className="text-xs text-muted-foreground italic">No contestants registered</p>
                                    ) : (
                                      <div className="border border-border/40 rounded-md overflow-hidden">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="w-8">#</TableHead>
                                              <TableHead>Name</TableHead>
                                              <TableHead className="text-center">Scores</TableHead>
                                              <TableHead className="w-8"></TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {contestants.map((c: any, idx: number) => {
                                              const cScores = seScores.filter(
                                                (s) => s.contestant_registration_id === c.id
                                              );
                                              const isExpanded = expandedContestant === `${se.id}-${c.id}`;
                                              const toggleKey = `${se.id}-${c.id}`;
                                              return (
                                                <>
                                                  <TableRow
                                                    key={c.id}
                                                    className="cursor-pointer hover:bg-muted/50"
                                                    onClick={() =>
                                                      setExpandedContestant(isExpanded ? null : toggleKey)
                                                    }
                                                  >
                                                    <TableCell className="font-mono text-muted-foreground text-xs">
                                                      {idx + 1}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-sm">{c.full_name}</TableCell>
                                                    <TableCell className="text-center">
                                                      <Badge variant="outline" className="text-xs">
                                                        {cScores.length} judge{cScores.length !== 1 ? "s" : ""}
                                                      </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                      <ChevronDown
                                                        className={`h-4 w-4 text-muted-foreground transition-transform ${
                                                          isExpanded ? "rotate-180" : ""
                                                        }`}
                                                      />
                                                    </TableCell>
                                                  </TableRow>
                                                  {isExpanded && cScores.length > 0 && rubricNames.length > 0 && (
                                                    <TableRow key={`${c.id}-scores`}>
                                                      <TableCell colSpan={4} className="p-0 border-0">
                                                        <AnimatePresence>
                                                          <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden bg-muted/20 p-3"
                                                          >
                                                            <SideBySideScores
                                                              scores={cScores.map((s) => ({
                                                                ...s,
                                                                judge_id:
                                                                  profileMap.get(s.judge_id) ||
                                                                  s.judge_id.slice(0, 8) + "…",
                                                              })) as any}
                                                              rubricNames={rubricNames}
                                                              contestantName={c.full_name}
                                                              contestantUserId={c.user_id}
                                                            />
                                                          </motion.div>
                                                        </AnimatePresence>
                                                      </TableCell>
                                                    </TableRow>
                                                  )}
                                                </>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    )}
                                  </div>

                                  {/* Score sheet link */}
                                  <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                                    <Link to={`/competitions/${selectedCompId}/master-sheet?sub_event=${se.id}`}>
                                      <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                                      Master Score Sheet
                                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                    </Link>
                                  </Button>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })
                      )}
                    </motion.div>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}
