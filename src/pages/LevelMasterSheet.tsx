import { useMemo, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trophy, CheckCircle, ArrowUp, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { calculateMethodScore } from "@/lib/scoring-methods";
import { useLevelCompletion, useNextLevel, usePromoteContestants } from "@/hooks/useLevelAdvancement";
import type { JudgeScore } from "@/hooks/useJudgeScores";
import type { SheetRow } from "@/lib/export-utils";

function useLevelMasterSheet(competitionId: string | undefined, levelId: string | null) {
  return useQuery({
    queryKey: ["level_master_sheet", competitionId, levelId],
    enabled: !!competitionId && !!levelId,
    queryFn: async () => {
      const { data: level } = await supabase
        .from("competition_levels")
        .select("*")
        .eq("id", levelId!)
        .single();

      const { data: competition } = await supabase
        .from("competitions")
        .select("scoring_method")
        .eq("id", competitionId!)
        .single();

      const { data: subEvents } = await supabase
        .from("sub_events")
        .select("*")
        .eq("level_id", levelId!)
        .order("event_date");

      const subEventIds = (subEvents || []).map((se) => se.id);
      if (!subEventIds.length) {
        return { level, scoringMethod: "olympic", subEvents: [], registrations: [], scores: [], profiles: [], rubric: [] };
      }

      const { data: registrations } = await supabase
        .from("contestant_registrations")
        .select("id, full_name, user_id, sub_event_id")
        .eq("competition_id", competitionId!)
        .in("sub_event_id", subEventIds)
        .eq("status", "approved");

      const { data: scores } = await supabase
        .from("judge_scores")
        .select("*")
        .in("sub_event_id", subEventIds);

      const judgeIds = [...new Set((scores || []).map((s: any) => s.judge_id))];
      const { data: profiles } = judgeIds.length
        ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", judgeIds)
        : { data: [] as any[] };

      const { data: rubric } = await supabase
        .from("rubric_criteria")
        .select("*")
        .eq("competition_id", competitionId!)
        .order("sort_order");

      return {
        level,
        scoringMethod: (competition as any)?.scoring_method || "olympic",
        subEvents: subEvents || [],
        registrations: registrations || [],
        scores: (scores || []) as JudgeScore[],
        profiles: profiles || [],
        rubric: rubric || [],
      };
    },
  });
}

function useLevelsForCompetition(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["competition_levels_list", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competition_levels")
        .select("id, name, sort_order")
        .eq("competition_id", competitionId!)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });
}

function getRankBadge(rank: number, isFinalRound: boolean, advancementCount: number | null) {
  if (isFinalRound) {
    if (rank === 0) return <Badge className="bg-amber-500 text-white text-[10px] px-1.5">🥇 Champion</Badge>;
    if (rank === 1) return <Badge className="bg-gray-400 text-white text-[10px] px-1.5">🥈 2nd Place</Badge>;
    if (rank === 2) return <Badge className="bg-amber-700 text-white text-[10px] px-1.5">🥉 3rd Place</Badge>;
    return null;
  }
  if (advancementCount == null) return null;
  if (rank < advancementCount) return <Badge className="bg-emerald-600 text-white text-[10px] px-1.5">Advances</Badge>;
  if (rank === advancementCount || rank === advancementCount + 1) return <Badge className="bg-amber-500/80 text-white text-[10px] px-1.5">Standby</Badge>;
  return null;
}

export default function LevelMasterSheet() {
  const { id: competitionId } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const canExport = hasRole("admin") || hasRole("organizer");
  const canPromote = hasRole("admin") || hasRole("organizer");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showStatusStyling, setShowStatusStyling] = useState(true);
  const levelId = searchParams.get("level");

  const { data: levels, isLoading: levelsLoading } = useLevelsForCompetition(competitionId);
  const { data, isLoading } = useLevelMasterSheet(competitionId, levelId);

  const isFinalRound = (data?.level as any)?.is_final_round || false;
  const advancementCount = isFinalRound ? null : (data?.level?.advancement_count ?? null);
  const levelSortOrder = data?.level?.sort_order;

  const { data: completion } = useLevelCompletion(levelId);
  const { data: nextLevel } = useNextLevel(competitionId, levelSortOrder);
  const promote = usePromoteContestants();

  const judgeUserIds = useMemo(() => {
    return [...new Set((data?.scores || []).map((s) => s.judge_id as string))];
  }, [data?.scores]);
  const profileMap = useStaffDisplayNames(judgeUserIds);

  const subEventMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const se of data?.subEvents || []) {
      m.set(se.id, se.name);
    }
    return m;
  }, [data?.subEvents]);

  const scoringMethod = data?.scoringMethod || "olympic";

  const rows = useMemo(() => {
    if (!data) return [];
    return (data.registrations || [])
      .map((reg) => {
        const regScores = data.scores.filter((s) => s.contestant_registration_id === reg.id);
        const judgeScores: Record<string, { rawTotal: number; final: number; certified: boolean }> = {};
        for (const s of regScores) {
          judgeScores[s.judge_id] = { rawTotal: s.raw_total, final: s.final_score, certified: s.is_certified };
        }
        const certifiedScores = regScores.filter((s) => s.is_certified);
        const rawTotals = certifiedScores.map((s) => s.raw_total);
        const timePenalty = certifiedScores.length > 0
          ? Math.max(...certifiedScores.map((s) => s.time_penalty))
          : 0;
        const allJudgesRawTotal = rawTotals.reduce((a, b) => a + b, 0);
        const avgFinal = certifiedScores.length > 0
          ? calculateMethodScore(scoringMethod, rawTotals, timePenalty)
          : 0;
        return {
          regId: reg.id,
          name: reg.full_name,
          userId: reg.user_id,
          subEventId: reg.sub_event_id,
          judgeScores,
          allJudgesRawTotal,
          timePenalty,
          avgFinal,
          certifiedCount: certifiedScores.length,
          totalJudges: regScores.length,
        };
      })
      .sort((a, b) => b.avgFinal - a.avgFinal || b.allJudgesRawTotal - a.allJudgesRawTotal);
  }, [data, scoringMethod]);

  const exportRows = useMemo((): SheetRow[] => {
    return rows.map((r, i) => {
      const row: SheetRow = { Rank: i + 1, Contestant: r.name, "Sub-Event": subEventMap.get(r.subEventId || "") || "—" };
      for (const jId of judgeUserIds) {
        const js = r.judgeScores[jId];
        row[profileMap.get(jId) || "Judge"] = js ? Number(js.rawTotal.toFixed(2)) : 0;
      }
      row["All Judges Total"] = Number(r.allJudgesRawTotal.toFixed(2));
      row["Penalty"] = Number(r.timePenalty.toFixed(2));
      row["Final Score"] = Number(r.avgFinal.toFixed(2));
      if (isFinalRound) {
        row["Placement"] = i === 0 ? "Champion" : i === 1 ? "2nd Place" : i === 2 ? "3rd Place" : "";
      } else if (advancementCount != null) {
        row["Advances"] = i < advancementCount ? "Yes" : (i === advancementCount || i === advancementCount + 1) ? "Standby" : "";
      }
      return row;
    });
  }, [rows, judgeUserIds, profileMap, subEventMap, advancementCount, isFinalRound]);

  const exportFilename = `level-sheet-${data?.level?.name || "export"}`.replace(/\s+/g, "-").toLowerCase();

  if (isLoading || levelsLoading) return <DashboardSkeleton />;

  const levelSelector = (levels && levels.length > 0) ? (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">Level:</span>
      <Select
        value={levelId || ""}
        onValueChange={(val) => navigate(`/competitions/${competitionId}/level-sheet?level=${val}`, { replace: true })}
      >
        <SelectTrigger className="w-[200px] h-8 text-sm">
          <SelectValue placeholder="Select a level" />
        </SelectTrigger>
        <SelectContent>
          {levels.map((l) => (
            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : null;

  if (!data?.level) {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Level Master Sheet
          </h1>
        </div>
        {levelSelector || <p className="text-muted-foreground">No levels found for this competition.</p>}
        {levels && levels.length > 0 && !levelId && (
          <p className="text-sm text-muted-foreground">Select a level above to view results.</p>
        )}
      </div>
    );
  }

  const handlePromote = () => {
    if (!competitionId || !levelId || !nextLevel || advancementCount == null) return;
    promote.mutate({
      competitionId,
      currentLevelId: levelId,
      nextLevelId: nextLevel.id,
      advancementCount,
      scoringMethod,
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Level complete banner */}
      {completion?.isComplete && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4" />
            Level Complete — All {completion.totalSubEvents} sub-event{completion.totalSubEvents !== 1 ? "s" : ""} certified
          </div>
          {canPromote && nextLevel && advancementCount != null && advancementCount > 0 && (
            <Button size="sm" onClick={handlePromote} disabled={promote.isPending} className="gap-1.5">
              <ArrowUp className="h-3.5 w-3.5" />
              {promote.isPending ? "Promoting…" : `Promote Top ${advancementCount} to ${nextLevel.name}`}
            </Button>
          )}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between print:mb-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0 print:hidden" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Level Master Sheet
              {isFinalRound && <Badge className="bg-amber-500 text-white text-xs ml-1">Final Round</Badge>}
            </h1>
            <p className="text-sm text-muted-foreground">
              {data.level.name} • {data.subEvents.length} sub-event{data.subEvents.length !== 1 ? "s" : ""} combined
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          <div className="flex items-center gap-1.5">
            {showStatusStyling ? <Eye className="h-3.5 w-3.5 text-muted-foreground" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
            <Switch checked={showStatusStyling} onCheckedChange={setShowStatusStyling} id="status-toggle" />
            <Label htmlFor="status-toggle" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">Status</Label>
          </div>
          {levelSelector}
          {canExport && <ExportDropdown rows={exportRows} filename={exportFilename} sheetName="Level Sheet" />}
        </div>
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {rows.length} Contestant{rows.length !== 1 ? "s" : ""} • {judgeUserIds.length} Judge{judgeUserIds.length !== 1 ? "s" : ""}
          </CardTitle>
          <CardDescription>
            Overall ranking across all sub-events in this level.
            {isFinalRound && (
              <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">
                Final round — Champion placements shown.
              </span>
            )}
            {!isFinalRound && advancementCount != null && (
              <span className="ml-1 font-medium text-emerald-600 dark:text-emerald-400">
                Top {advancementCount} advance to the next level. +2 standbys.
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
                    <TableHead className="text-xs">Sub-Event</TableHead>
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
                    const advances = !isFinalRound && advancementCount != null && i < advancementCount;
                    const standby = !isFinalRound && advancementCount != null && (i === advancementCount || i === advancementCount + 1);
                    return (
                      <TableRow
                        key={r.regId}
                        className={
                          showStatusStyling && advances ? "bg-emerald-50 dark:bg-emerald-950/20"
                          : showStatusStyling && standby ? "bg-amber-50 dark:bg-amber-950/10"
                          : showStatusStyling && isFinalRound && i < 3 ? "bg-amber-50/50 dark:bg-amber-950/10"
                          : ""
                        }
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
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {subEventMap.get(r.subEventId || "") || "—"}
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
                            {getRankBadge(i, isFinalRound, advancementCount)}
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
