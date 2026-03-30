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
import { ArrowLeft, Trophy, CheckCircle, ArrowUp, ArrowDown, Eye, EyeOff, Award, AlertTriangle, Undo2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LevelSheetExportModal } from "@/components/level-sheet/LevelSheetExportModal";
import { calculateMethodScore } from "@/lib/scoring-methods";
import { useLevelCompletion, useNextLevel, usePromoteContestants, usePromotionCompleted, useRollbackPromotion } from "@/hooks/useLevelAdvancement";
import { useSpecialAwards } from "@/components/competition/SpecialAwardsManager";
import { useAllSpecialAwardVotes } from "@/components/competition/SpecialAwardsVoting";
import type { JudgeScore } from "@/hooks/useJudgeScores";

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
        .select("name, scoring_method, branding_logo_url, branding_primary_color, branding_accent_color")
        .eq("id", competitionId!)
        .single();

      const { data: subEvents } = await supabase
        .from("sub_events")
        .select("*")
        .eq("level_id", levelId!)
        .order("event_date");

      const subEventIds = (subEvents || []).map((se) => se.id);
      if (!subEventIds.length) {
        return { level, competition, scoringMethod: "olympic", subEvents: [], registrations: [], scores: [], profiles: [], rubric: [], certifications: { chief: [], tab: [], witness: [] } };
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

      // Fetch certifications for all sub-events in this level
      const { data: chiefCerts } = await supabase
        .from("chief_judge_certifications")
        .select("chief_judge_id, is_certified, signed_at")
        .in("sub_event_id", subEventIds);
      const { data: tabCerts } = await supabase
        .from("tabulator_certifications")
        .select("tabulator_id, is_certified, signed_at")
        .in("sub_event_id", subEventIds);
      const { data: witnessCerts } = await supabase
        .from("witness_certifications")
        .select("witness_id, is_certified, signed_at")
        .in("sub_event_id", subEventIds);

      return {
        level,
        competition,
        scoringMethod: (competition as any)?.scoring_method || "olympic",
        subEvents: subEvents || [],
        registrations: registrations || [],
        scores: (scores || []) as JudgeScore[],
        profiles: profiles || [],
        rubric: rubric || [],
        certifications: {
          chief: chiefCerts || [],
          tab: tabCerts || [],
          witness: witnessCerts || [],
        },
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
  const canExport = hasRole("admin") || hasRole("organizer") || hasRole("tabulator");
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
  const rollback = useRollbackPromotion();
  const { data: alreadyPromoted } = usePromotionCompleted(competitionId, levelId, nextLevel?.id, advancementCount);

  const judgeUserIds = useMemo(() => {
    return [...new Set((data?.scores || []).map((s) => s.judge_id as string))];
  }, [data?.scores]);
  const profileMap = useStaffDisplayNames(judgeUserIds);

  // Collect certification user IDs for display names
  const certUserIds = useMemo(() => {
    if (!data?.certifications) return [];
    const ids = new Set<string>();
    for (const c of data.certifications.chief) ids.add(c.chief_judge_id);
    for (const t of data.certifications.tab) ids.add(t.tabulator_id);
    for (const w of data.certifications.witness) ids.add(w.witness_id);
    return [...ids];
  }, [data?.certifications]);
  const certNameMap = useStaffDisplayNames(certUserIds);

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

  // Build rows for export modal
  const exportModalRows = useMemo(() => {
    return rows.map((r) => ({
      name: r.name,
      subEvent: subEventMap.get(r.subEventId || "") || "—",
      judgeScores: r.judgeScores,
      allJudgesRawTotal: r.allJudgesRawTotal,
      timePenalty: r.timePenalty,
      avgFinal: r.avgFinal,
    }));
  }, [rows, subEventMap]);

  // Build certifications info for export modal
  const certInfoList = useMemo(() => {
    if (!data?.certifications) return [];
    const list: { name: string; role: string; certified: boolean; signedAt?: string | null }[] = [];
    for (const c of data.certifications.chief) {
      list.push({ name: certNameMap.get(c.chief_judge_id) || "Unknown", role: "Chief Judge", certified: c.is_certified, signedAt: c.signed_at });
    }
    for (const t of data.certifications.tab) {
      list.push({ name: certNameMap.get(t.tabulator_id) || "Unknown", role: "Tabulator", certified: t.is_certified, signedAt: t.signed_at });
    }
    for (const w of data.certifications.witness) {
      list.push({ name: certNameMap.get(w.witness_id) || "Unknown", role: "Witness", certified: w.is_certified, signedAt: w.signed_at });
    }
    return list;
  }, [data?.certifications, certNameMap]);

  const competitionName = (data?.competition as any)?.name || "Competition";
  const competitionLogo = (data?.competition as any)?.branding_logo_url;
  const primaryColor = (data?.competition as any)?.branding_primary_color || "#1a1a2e";
  const accentColor = (data?.competition as any)?.branding_accent_color || "#e94560";

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

  const handleRollback = () => {
    if (!competitionId || !nextLevel) return;
    rollback.mutate({ competitionId, nextLevelId: nextLevel.id });
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
            alreadyPromoted ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  disabled
                  variant="outline"
                  className="gap-1.5 opacity-60 cursor-not-allowed"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  Promoted to {nextLevel.name}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" disabled={rollback.isPending} className="gap-1.5">
                      <Undo2 className="h-3.5 w-3.5" />
                      {rollback.isPending ? "Rolling back…" : "Undo"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Undo Promotion
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove all promoted registrations from <span className="font-semibold text-foreground">{nextLevel.name}</span> that have not yet been scored. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRollback} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Yes, Rollback
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" disabled={promote.isPending} className="gap-1.5">
                    <ArrowUp className="h-3.5 w-3.5" />
                    {promote.isPending ? "Promoting…" : `Promote Top ${advancementCount} to ${nextLevel.name}`}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Confirm Promotion
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will promote the top {advancementCount} contestant{advancementCount !== 1 ? "s" : ""} to <span className="font-semibold text-foreground">{nextLevel.name}</span>. This action creates new registrations in the next level and cannot be easily undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePromote}>
                      Yes, Promote
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )
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
          {canExport && (
            <LevelSheetExportModal
              competitionName={competitionName}
              competitionLogo={competitionLogo}
              primaryColor={primaryColor}
              accentColor={accentColor}
              levelName={data?.level?.name || ""}
              isFinalRound={isFinalRound}
              advancementCount={advancementCount}
              subEventCount={data?.subEvents?.length || 0}
              rows={exportModalRows}
              judgeIds={judgeUserIds}
              judgeNames={profileMap}
              certifications={certInfoList}
            />
          )}
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
                            {showStatusStyling && getRankBadge(i, isFinalRound, advancementCount)}
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

      {/* Special Awards Results */}
      {isFinalRound && <AwardsResultsSection competitionId={competitionId!} registrations={data?.registrations || []} />}
    </div>
  );
}

function AwardsResultsSection({ competitionId, registrations }: { competitionId: string; registrations: { id: string; full_name: string }[] }) {
  const { data: awards } = useSpecialAwards(competitionId);
  const { data: votes } = useAllSpecialAwardVotes(competitionId);

  if (!awards?.length) return null;

  const regMap = new Map(registrations.map(r => [r.id, r.full_name]));

  // Tally votes per award
  const tallies = awards.map(award => {
    const awardVotes = (votes || []).filter(v => v.special_award_id === award.id);
    const counts = new Map<string, number>();
    for (const v of awardVotes) {
      counts.set(v.contestant_registration_id, (counts.get(v.contestant_registration_id) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const winner = sorted[0];
    return { award, totalVotes: awardVotes.length, winner: winner ? { name: regMap.get(winner[0]) || "Unknown", votes: winner[1] } : null };
  });

  return (
    <Card className="border-amber-500/30 bg-card/80 mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-500" />
          Special Awards
        </CardTitle>
        <CardDescription>Judge voting results for challenge trophies and special prizes.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Award</TableHead>
              <TableHead>Winner</TableHead>
              <TableHead className="text-center">Votes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tallies.map(({ award, winner }) => (
              <TableRow key={award.id}>
                <TableCell className="font-medium text-sm">{award.name}</TableCell>
                <TableCell className="text-sm">
                  {winner ? (
                    <span className="flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      {winner.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No votes yet</span>
                  )}
                </TableCell>
                <TableCell className="text-center font-mono text-sm">{winner?.votes || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
