import { useMemo } from "react";
import { useStaffDisplayNames } from "@/hooks/useStaffDisplayNames";
import { DashboardSkeleton } from "@/components/shared/PageSkeletons";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy } from "lucide-react";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { calculateMethodScore } from "@/lib/scoring-methods";
import type { JudgeScore } from "@/hooks/useJudgeScores";
import type { SheetRow } from "@/lib/export-utils";

function useMasterSheet(competitionId: string | undefined, subEventId: string | null) {
  return useQuery({
    queryKey: ["master_sheet", competitionId, subEventId],
    enabled: !!competitionId && !!subEventId,
    queryFn: async () => {
      const { data: competition } = await supabase
        .from("competitions")
        .select("scoring_method")
        .eq("id", competitionId!)
        .single();

      const { data: subEvent } = await supabase
        .from("sub_events")
        .select("*, competition_levels(id, name, advancement_count, is_final_round)")
        .eq("id", subEventId!)
        .single();

      const { data: registrations } = await supabase
        .from("contestant_registrations")
        .select("id, full_name, user_id, sub_event_id")
        .eq("competition_id", competitionId!)
        .eq("sub_event_id", subEventId!)
        .eq("status", "approved");

      const { data: scores } = await supabase
        .from("judge_scores")
        .select("*")
        .eq("sub_event_id", subEventId!);

      const { data: rubric } = await supabase
        .from("rubric_criteria")
        .select("*")
        .eq("competition_id", competitionId!)
        .order("sort_order");

      const { data: assignments } = await supabase
        .from("sub_event_assignments")
        .select("*")
        .eq("sub_event_id", subEventId!)
        .eq("role", "judge" as any);

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
        advancementCount: (subEvent as any)?.competition_levels?.advancement_count ?? null,
        isFinalRound: (subEvent as any)?.competition_levels?.is_final_round ?? false,
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
  const navigate = useNavigate();
  const { id: competitionId } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const canExport = hasRole("admin") || hasRole("organizer");
  const [searchParams] = useSearchParams();
  const subEventId = searchParams.get("sub_event");

  const { data, isLoading } = useMasterSheet(competitionId, subEventId);

  const judgeUserIds = useMemo(() => {
    const fromAssignments = (data?.assignments || []).map((a: any) => a.user_id as string);
    const fromScores = (data?.scores || []).map((s) => s.judge_id as string);
    return [...new Set([...fromAssignments, ...fromScores])];
  }, [data?.assignments, data?.scores]);
  const profileMap = useStaffDisplayNames(judgeUserIds);

  // Build rows with corrected Olympic calculation
  const rows = useMemo(() => {
    if (!data) return [];
    const method = data.scoringMethod || "olympic";
    return (data.registrations || [])
      .map((reg) => {
        const regScores = data.scores.filter((s) => s.contestant_registration_id === reg.id);
        const judgeScores: Record<string, { rawTotal: number; final: number; certified: boolean }> = {};
        for (const s of regScores) {
          judgeScores[s.judge_id] = { rawTotal: s.raw_total, final: s.final_score, certified: s.is_certified };
        }
        const certifiedScores = regScores.filter((s) => s.is_certified);
        const rawTotals = certifiedScores.map((s) => s.raw_total);
        // Single penalty per contestant (take max — they should all be the same)
        const timePenalty = certifiedScores.length > 0
          ? Math.max(...certifiedScores.map((s) => s.time_penalty))
          : 0;
        const allJudgesRawTotal = rawTotals.reduce((a, b) => a + b, 0);
        const avgFinal = certifiedScores.length > 0
          ? calculateMethodScore(method, rawTotals, timePenalty)
          : 0;
        const allCertified = regScores.length > 0 && regScores.every((s) => s.is_certified);
        return {
          regId: reg.id,
          name: reg.full_name,
          userId: reg.user_id,
          judgeScores,
          allJudgesRawTotal,
          timePenalty,
          avgFinal,
          allCertified,
          totalJudges: regScores.length,
          certifiedCount: certifiedScores.length,
        };
      })
      .sort((a, b) => b.avgFinal - a.avgFinal || b.allJudgesRawTotal - a.allJudgesRawTotal);
  }, [data]);

  const isFinalRound = data?.isFinalRound ?? false;
  const advancementCount = isFinalRound ? null : (data?.advancementCount ?? null);

  // Build exportable rows
  const exportRows = useMemo((): SheetRow[] => {
    return rows.map((r, i) => {
      const row: SheetRow = { Rank: i + 1, Contestant: r.name };
      for (const jId of judgeUserIds) {
        const js = r.judgeScores[jId];
        row[profileMap.get(jId) || "Judge"] = js ? Number(js.rawTotal.toFixed(2)) : 0;
      }
      row["All Judges Total"] = Number(r.allJudgesRawTotal.toFixed(2));
      row["Penalty"] = Number(r.timePenalty.toFixed(2));
      row["Final Score"] = Number(r.avgFinal.toFixed(2));
      if (advancementCount != null) {
        row["Advances"] = i < advancementCount ? "Yes" : "";
      }
      return row;
    });
  }, [rows, judgeUserIds, profileMap, advancementCount]);

  const exportFilename = `master-sheet-${data?.subEvent?.name || "export"}`.replace(/\s+/g, "-").toLowerCase();

  if (isLoading) return <DashboardSkeleton />;

  if (!data?.subEvent) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <p className="text-muted-foreground">Sub-event not found.</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between print:mb-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0 print:hidden" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Master Score Sheet
            </h1>
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
          <CardDescription>
            Each column shows the judge's raw total. Final score uses the {data.scoringMethod === "olympic" ? "Olympic (high-low trim)" : data.scoringMethod} method.
            {advancementCount != null && (
              <span className="ml-1 font-medium text-emerald-600 dark:text-emerald-400">
                Top {advancementCount} advance.
              </span>
            )}
          </CardDescription>
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
                    <TableHead className="text-center font-bold text-xs">All Judges Total</TableHead>
                    <TableHead className="text-center font-bold text-xs">Penalty</TableHead>
                    <TableHead className="text-center font-bold text-xs">Final Score</TableHead>
                    <TableHead className="text-center">Rank</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => {
                    const advances = advancementCount != null && i < advancementCount;
                    return (
                      <TableRow
                        key={r.regId}
                        className={advances ? "bg-emerald-50 dark:bg-emerald-950/20" : ""}
                      >
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
                                  {js.rawTotal.toFixed(2)}
                                  {!js.certified && <span className="text-[10px] ml-0.5">*</span>}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-mono font-bold text-xs">
                          {r.allJudgesRawTotal.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {r.timePenalty > 0 ? (
                            <span className="text-destructive">-{r.timePenalty.toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold">{r.avgFinal.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Badge variant={i === 0 ? "default" : "outline"} className="text-xs font-mono">
                              {i + 1}
                            </Badge>
                            {advances && (
                              <Badge className="bg-emerald-600 text-white text-[10px] px-1.5">
                                Advances
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
