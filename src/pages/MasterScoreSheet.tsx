import { useMemo } from "react";
import { useStaffDisplayNames } from "@/hooks/useStaffDisplayNames";
import { DashboardSkeleton } from "@/components/shared/PageSkeletons";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { calculateMethodScore } from "@/lib/scoring-methods";
import type { JudgeScore } from "@/hooks/useJudgeScores";
import type { SheetRow } from "@/lib/export-utils";

function useMasterSheet(competitionId: string | undefined, subEventId: string | null) {
  return useQuery({
    queryKey: ["master_sheet", competitionId, subEventId],
    enabled: !!competitionId && !!subEventId,
    queryFn: async () => {
      // Competition info (for scoring_method)
      const { data: competition } = await supabase
        .from("competitions")
        .select("scoring_method")
        .eq("id", competitionId!)
        .single();

      // Sub-event info
      const { data: subEvent } = await supabase
        .from("sub_events")
        .select("*")
        .eq("id", subEventId!)
        .single();

      // Contestants for this sub-event
      const { data: registrations } = await supabase
        .from("contestant_registrations")
        .select("id, full_name, user_id, sub_event_id")
        .eq("competition_id", competitionId!)
        .eq("sub_event_id", subEventId!)
        .neq("status", "rejected");

      // All scores for this sub-event
      const { data: scores } = await supabase
        .from("judge_scores")
        .select("*")
        .eq("sub_event_id", subEventId!);

      // Rubric criteria
      const { data: rubric } = await supabase
        .from("rubric_criteria")
        .select("*")
        .eq("competition_id", competitionId!)
        .order("sort_order");

      // Judge assignments for this sub-event
      const { data: assignments } = await supabase
        .from("sub_event_assignments")
        .select("*")
        .eq("sub_event_id", subEventId!)
        .eq("role", "judge" as any);

      // Judge profiles
      const judgeIds = [...new Set([
        ...(assignments || []).map((a: any) => a.user_id),
        ...(scores || []).map((s: any) => s.judge_id),
      ])];
      const { data: profiles } = judgeIds.length
        ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", judgeIds)
        : { data: [] as any[] };

      return {
        scoringMethod: (competition as any)?.scoring_method || "olympic",
        subEvent,
        registrations: registrations || [],
        scores: (scores || []) as JudgeScore[],
        rubric: rubric || [],
        assignments: assignments || [],
        profiles: profiles || [],
      };
    },
  });
}

export default function MasterScoreSheet() {
  const { id: competitionId } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const canExport = hasRole("admin") || hasRole("organizer");
  const [searchParams] = useSearchParams();
  const subEventId = searchParams.get("sub_event");

  const { data, isLoading } = useMasterSheet(competitionId, subEventId);

  // Ordered list of judge user_ids (used for both name resolution and column ordering)
  const judgeUserIds = useMemo(() => {
    const fromAssignments = (data?.assignments || []).map((a: any) => a.user_id as string);
    const fromScores = (data?.scores || []).map((s) => s.judge_id as string);
    return [...new Set([...fromAssignments, ...fromScores])];
  }, [data?.assignments, data?.scores]);
  const profileMap = useStaffDisplayNames(judgeUserIds);

  const rubricNames = useMemo(
    () => (data?.rubric || []).map((r: any) => r.name as string),
    [data?.rubric]
  );

  // Build rows: one per contestant, with each judge's final score
  const rows = useMemo(() => {
    if (!data) return [];
    const method = data.scoringMethod || "olympic";
    return (data.registrations || [])
      .map((reg) => {
        const regScores = data.scores.filter((s) => s.contestant_registration_id === reg.id);
        const judgeScores: Record<string, { final: number; certified: boolean }> = {};
        for (const s of regScores) {
          judgeScores[s.judge_id] = { final: s.final_score, certified: s.is_certified };
        }
        const certifiedScores = regScores.filter((s) => s.is_certified);
        const rawTotals = certifiedScores.map((s) => s.raw_total);
        const avgPenalty = certifiedScores.length > 0
          ? certifiedScores.reduce((a, s) => a + s.time_penalty, 0) / certifiedScores.length
          : 0;
        const total = certifiedScores.reduce((a, s) => a + s.final_score, 0);
        const avgFinal = certifiedScores.length > 0
          ? calculateMethodScore(method, rawTotals, avgPenalty)
          : 0;
        const allCertified = regScores.length > 0 && regScores.every((s) => s.is_certified);
        return {
          regId: reg.id,
          name: reg.full_name,
          userId: reg.user_id,
          judgeScores,
          total,
          avgFinal,
          allCertified,
          totalJudges: regScores.length,
          certifiedCount: certifiedScores.length,
        };
      })
      .sort((a, b) => b.avgFinal - a.avgFinal || b.total - a.total);
  }, [data]);

  // Build exportable rows
  const exportRows = useMemo((): SheetRow[] => {
    return rows.map((r, i) => {
      const row: SheetRow = { Rank: i + 1, Contestant: r.name };
      for (const jId of judgeUserIds) {
        const js = r.judgeScores[jId];
        row[profileMap.get(jId) || "Judge"] = js ? Number(js.final.toFixed(2)) : 0;
      }
      row["Total"] = Number(r.total.toFixed(2));
      row["Avg Final"] = Number(r.avgFinal.toFixed(2));
      return row;
    });
  }, [rows, judgeUserIds, profileMap]);

  const exportFilename = `master-sheet-${data?.subEvent?.name || "export"}`.replace(/\s+/g, "-").toLowerCase();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!data?.subEvent) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <p className="text-muted-foreground">Sub-event not found.</p>
        <Button asChild variant="ghost" size="sm" className="mt-2">
          <Link to="/judging">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Judging Hub
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4 flex items-center justify-between print:mb-2">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="shrink-0 print:hidden">
            <Link to="/judging">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">Master Score Sheet</h1>
            <p className="text-sm text-muted-foreground">
              {data.subEvent.name} • {data.subEvent.event_date || "No date"}
            </p>
          </div>
        </div>
        {canExport && <ExportDropdown rows={exportRows} filename={exportFilename} sheetName="Master Sheet" />}
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {rows.length} Contestant{rows.length !== 1 ? "s" : ""} • {judgeUserIds.length} Judge{judgeUserIds.length !== 1 ? "s" : ""}
          </CardTitle>
          <CardDescription>Each column shows the judge's final score for the contestant.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No scores submitted yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Contestant</TableHead>
                    {judgeUserIds.map((jId) => (
                      <TableHead key={jId} className="text-center text-xs whitespace-nowrap">
                        {profileMap.get(jId) || "Judge"}
                      </TableHead>
                      ))}
                      <TableHead className="text-center font-bold">Total</TableHead>
                      <TableHead className="text-center font-bold">Avg Final</TableHead>
                      <TableHead className="text-center">Rank</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={r.regId}>
                      <TableCell className="font-mono text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm">
                        <Link
                          to={`/profile/${r.userId}`}
                          className="hover:text-secondary hover:underline transition-colors"
                        >
                          {r.name}
                        </Link>
                      </TableCell>
                      {judgeUserIds.map((jId) => {
                        const js = r.judgeScores[jId];
                        return (
                          <TableCell key={jId} className="text-center font-mono text-xs">
                            {js ? (
                              <span className={js.certified ? "text-foreground" : "text-muted-foreground"}>
                                {js.final.toFixed(2)}
                                {!js.certified && <span className="text-[10px] ml-0.5">*</span>}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-mono font-bold">{r.total.toFixed(2)}</TableCell>
                      <TableCell className="text-center font-mono font-bold">{r.avgFinal.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={i === 0 ? "default" : "outline"} className="text-xs font-mono">
                          {i + 1}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-[10px] text-muted-foreground mt-2">* Uncertified score</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
