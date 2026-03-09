import { Fragment, useState, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useAllScoresForSubEvent } from "@/hooks/useChiefJudge";
import { useJudgeScoresRealtime } from "@/hooks/useJudgeScores";
import { useStaffDisplayNames } from "@/hooks/useStaffDisplayNames";
import { useRegistrations, useRegistrationsRealtime } from "@/hooks/useRegistrations";
import { useRubricCriteria } from "@/hooks/useCompetitions";
import { SideBySideScores } from "@/components/tabulator/SideBySideScores";
import { ConnectionIndicator } from "@/components/shared/ConnectionIndicator";
import { CardGridSkeleton } from "@/components/shared/PageSkeletons";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import type { JudgeScore } from "@/hooks/useJudgeScores";

export default function ContestantScoresOverview() {
  const { id: competitionId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const subEventId = searchParams.get("sub_event") || "";

  const { data: subEvent } = useQuery({
    queryKey: ["sub_event_detail", subEventId],
    enabled: !!subEventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_events")
        .select("*, competition_levels(name)")
        .eq("id", subEventId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: allScores, isLoading: scoresLoading } = useAllScoresForSubEvent(subEventId);
  useJudgeScoresRealtime(subEventId);

  const { data: registrations, isLoading: regsLoading } = useRegistrations(competitionId);
  useRegistrationsRealtime(competitionId);

  const { data: rubric } = useRubricCriteria(competitionId || "");
  const rubricNames = useMemo(() => (rubric || []).map((r: any) => r.name), [rubric]);
  const indexToName = useMemo(() => {
    const m: Record<string, string> = {};
    (rubric || []).forEach((r: any) => { m[r.id] = r.name; });
    return m;
  }, [rubric]);

  const contestants = useMemo(
    () => (registrations || [])
      .filter((r: any) => r.sub_event_id === subEventId && r.status !== "rejected")
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)),
    [registrations, subEventId],
  );

  const judgeIds = useMemo(() => [...new Set((allScores || []).map((s) => s.judge_id))], [allScores]);
  const staffNameMap = useStaffDisplayNames(judgeIds);
  const profileMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [uid, name] of staffNameMap.entries()) m[uid] = name;
    return m;
  }, [staffNameMap]);

  const [expandedContestant, setExpandedContestant] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 5;
  const totalPages = Math.ceil(contestants.length / pageSize);
  const pagedContestants = contestants.slice(page * pageSize, (page + 1) * pageSize);

  const loading = scoresLoading || regsLoading;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link to={`/dashboard`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Contestant Scores Overview
            <ConnectionIndicator />
          </h1>
          {subEvent && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {(subEvent as any).competition_levels?.name && (
                <span className="font-medium">{(subEvent as any).competition_levels.name} — </span>
              )}
              {subEvent.name}
              {subEvent.event_date && <span className="ml-2 font-mono text-xs">{subEvent.event_date}</span>}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <CardGridSkeleton cards={3} />
      ) : contestants.length === 0 ? (
        <Card className="border-border/50 bg-card/80">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No contestants registered for this sub-event.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 bg-card/80">
          <CardContent className="pt-4 space-y-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Contestants ({contestants.length})
            </p>

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
                  {pagedContestants.map((c: any) => {
                    const globalIdx = contestants.indexOf(c);
                    const cScores = (allScores || []).filter(
                      (s) => s.contestant_registration_id === c.id,
                    );
                    const toggleKey = c.id;
                    const isExpanded = expandedContestant === toggleKey;
                    return (
                      <Fragment key={c.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setExpandedContestant(isExpanded ? null : toggleKey)}
                        >
                          <TableCell className="font-mono text-muted-foreground text-xs">
                            {globalIdx + 1}
                          </TableCell>
                          <TableCell className="font-medium text-sm">{c.full_name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {cScores.length} judge{cScores.length !== 1 ? "s" : ""}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <ChevronDown
                              className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                                      judge_id: profileMap[s.judge_id] || s.judge_id.slice(0, 8) + "…",
                                    })) as any}
                                    rubricNames={rubricNames}
                                    indexToName={indexToName}
                                    contestantName={c.full_name}
                                    contestantUserId={c.user_id}
                                  />
                                </motion.div>
                              </AnimatePresence>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                </Button>
                <span className="text-xs text-muted-foreground font-mono">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
