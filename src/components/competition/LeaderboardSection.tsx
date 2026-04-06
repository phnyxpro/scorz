import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaffDisplayNames } from "@/hooks/useStaffDisplayNames";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trophy, Eye, EyeOff } from "lucide-react";
import { calculateMethodScore } from "@/lib/scoring-methods";
import type { JudgeScore } from "@/hooks/useJudgeScores";

function useLevelsForCompetition(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["competition_levels_list", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competition_levels")
        .select("id, name, sort_order, is_final_round, advancement_count")
        .eq("competition_id", competitionId!)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });
}

function useLeaderboardData(competitionId: string | undefined, levelId: string | null) {
  return useQuery({
    queryKey: ["leaderboard_data", competitionId, levelId],
    enabled: !!competitionId && !!levelId,
    queryFn: async () => {
      const { data: competition } = await supabase
        .from("competitions")
        .select("scoring_method")
        .eq("id", competitionId!)
        .single();

      const { data: subEvents } = await supabase
        .from("sub_events")
        .select("id, name")
        .eq("level_id", levelId!)
        .order("event_date");

      const subEventIds = (subEvents || []).map((se) => se.id);
      if (!subEventIds.length) return { scoringMethod: "olympic", subEvents: [], registrations: [], scores: [], profiles: [] };

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

      // Fetch all judges assigned to this level's sub-events
      const { data: assignments } = await supabase
        .from("sub_event_assignments")
        .select("user_id")
        .in("sub_event_id", subEventIds)
        .eq("role", "judge" as any);

      const assignedJudgeIds = new Set((assignments || []).map((a: any) => a.user_id));
      const scoringJudgeIds = (scores || []).map((s: any) => s.judge_id);
      for (const jId of scoringJudgeIds) assignedJudgeIds.add(jId);
      const judgeIds = [...assignedJudgeIds];

      const { data: profiles } = judgeIds.length
        ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", judgeIds)
        : { data: [] as any[] };

      return {
        scoringMethod: (competition as any)?.scoring_method || "olympic",
        subEvents: subEvents || [],
        registrations: registrations || [],
        scores: (scores || []) as JudgeScore[],
        profiles: profiles || [],
      };
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

interface Props {
  competitionId: string;
}

export function LeaderboardSection({ competitionId }: Props) {
  const { data: levels, isLoading: levelsLoading } = useLevelsForCompetition(competitionId);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [showStatusStyling, setShowStatusStyling] = useState(true);

  // Auto-select first level
  const levelId = selectedLevelId || levels?.[0]?.id || null;
  const selectedLevel = levels?.find((l) => l.id === levelId);
  const isFinalRound = selectedLevel?.is_final_round || false;
  const advancementCount = isFinalRound ? null : (selectedLevel?.advancement_count ?? null);

  const { data, isLoading } = useLeaderboardData(competitionId, levelId);

  const judgeUserIds = useMemo(() => {
    return [...new Set((data?.scores || []).map((s) => s.judge_id as string))];
  }, [data?.scores]);
  const profileMap = useStaffDisplayNames(judgeUserIds);

  const subEventMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const se of data?.subEvents || []) m.set(se.id, se.name);
    return m;
  }, [data?.subEvents]);

  const scoringMethod = data?.scoringMethod || "olympic";

  const rows = useMemo(() => {
    if (!data) return [];
    return (data.registrations || [])
      .map((reg) => {
        const regScores = data.scores.filter((s) => s.contestant_registration_id === reg.id);
        const judgeScores: Record<string, { rawTotal: number; certified: boolean }> = {};
        for (const s of regScores) {
          judgeScores[s.judge_id] = { rawTotal: s.raw_total, certified: s.is_certified };
        }
        const certifiedScores = regScores.filter((s) => s.is_certified);
        const rawTotals = certifiedScores.map((s) => s.raw_total);
        const timePenalty = certifiedScores.length > 0 ? Math.max(...certifiedScores.map((s) => s.time_penalty)) : 0;
        const allJudgesRawTotal = rawTotals.reduce((a, b) => a + b, 0);
        const avgFinal = certifiedScores.length > 0 ? calculateMethodScore(scoringMethod, rawTotals, timePenalty) : 0;
        const durations = regScores.map((s) => s.performance_duration_seconds).filter((d): d is number => d != null && d > 0);
        const durationSeconds = durations.length > 0 ? Math.max(...durations) : null;
        return {
          regId: reg.id,
          name: reg.full_name,
          userId: reg.user_id,
          subEventId: reg.sub_event_id,
          judgeScores,
          allJudgesRawTotal,
          timePenalty,
          avgFinal,
          durationSeconds,
        };
      })
      .sort((a, b) => b.avgFinal - a.avgFinal || b.allJudgesRawTotal - a.allJudgesRawTotal);
  }, [data, scoringMethod]);

  if (levelsLoading) return <div className="py-8 text-center text-muted-foreground text-sm">Loading levels…</div>;
  if (!levels?.length) return <div className="py-8 text-center text-muted-foreground text-sm">No levels configured yet.</div>;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Leaderboard</h2>
          {isFinalRound && <Badge className="bg-amber-500 text-white text-xs">Final Round</Badge>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {showStatusStyling ? <Eye className="h-3.5 w-3.5 text-muted-foreground" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
            <Switch checked={showStatusStyling} onCheckedChange={setShowStatusStyling} id="lb-status-toggle" />
            <Label htmlFor="lb-status-toggle" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">Status</Label>
          </div>
          <Select value={levelId || ""} onValueChange={(val) => setSelectedLevelId(val)}>
            <SelectTrigger className="w-[200px] h-8 text-sm">
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              {levels.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
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
                Top {advancementCount} advance. +2 standbys.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading scores…</div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No scores submitted yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Contestant</TableHead>
                    <TableHead className="text-xs">Sub-Event</TableHead>
                    <TableHead className="text-center text-xs">Duration</TableHead>
                    {judgeUserIds.map((jId) => (
                      <TableHead key={jId} className="text-center text-xs whitespace-nowrap">
                        {profileMap.get(jId) || "Judge"}
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-bold text-xs">Total</TableHead>
                    <TableHead className="text-center font-bold text-xs">Penalty</TableHead>
                    <TableHead className="text-center font-bold text-xs">Final</TableHead>
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
                          <Link to={`/profile/${r.userId}`} className="hover:text-secondary hover:underline transition-colors">
                            {r.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {subEventMap.get(r.subEventId || "") || "—"}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {r.durationSeconds != null
                            ? `${Math.floor(r.durationSeconds / 60)}:${String(Math.round(r.durationSeconds % 60)).padStart(2, "0")}`
                            : "—"}
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
                              ) : "—"}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-mono font-bold text-xs">{r.allJudgesRawTotal.toFixed(2)}</TableCell>
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
                            <Badge variant={i === 0 ? "default" : "outline"} className="text-xs font-mono">{i + 1}</Badge>
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
    </div>
  );
}
