import { useMemo } from "react";
import { DashboardSkeleton } from "@/components/shared/PageSkeletons";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy } from "lucide-react";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import type { JudgeScore } from "@/hooks/useJudgeScores";
import type { SheetRow } from "@/lib/export-utils";

function useLevelMasterSheet(competitionId: string | undefined, levelId: string | null) {
  return useQuery({
    queryKey: ["level_master_sheet", competitionId, levelId],
    enabled: !!competitionId && !!levelId,
    queryFn: async () => {
      // Level info
      const { data: level } = await supabase
        .from("competition_levels")
        .select("*")
        .eq("id", levelId!)
        .single();

      // All sub-events for this level
      const { data: subEvents } = await supabase
        .from("sub_events")
        .select("*")
        .eq("level_id", levelId!)
        .order("event_date");

      const subEventIds = (subEvents || []).map((se) => se.id);
      if (!subEventIds.length) {
        return { level, subEvents: [], registrations: [], scores: [], profiles: [], rubric: [] };
      }

      // All contestants across all sub-events in this level
      const { data: registrations } = await supabase
        .from("contestant_registrations")
        .select("id, full_name, user_id, sub_event_id")
        .eq("competition_id", competitionId!)
        .in("sub_event_id", subEventIds)
        .neq("status", "rejected");

      // All scores across all sub-events
      const { data: scores } = await supabase
        .from("judge_scores")
        .select("*")
        .in("sub_event_id", subEventIds);

      // Get all judge IDs from scores
      const judgeIds = [...new Set((scores || []).map((s: any) => s.judge_id))];
      const { data: profiles } = judgeIds.length
        ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", judgeIds)
        : { data: [] as any[] };

      // Rubric criteria
      const { data: rubric } = await supabase
        .from("rubric_criteria")
        .select("*")
        .eq("competition_id", competitionId!)
        .order("sort_order");

      return {
        level,
        subEvents: subEvents || [],
        registrations: registrations || [],
        scores: (scores || []) as JudgeScore[],
        profiles: profiles || [],
        rubric: rubric || [],
      };
    },
  });
}

export default function LevelMasterSheet() {
  const { id: competitionId } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const canExport = hasRole("admin") || hasRole("organizer");
  const [searchParams] = useSearchParams();
  const levelId = searchParams.get("level");

  const { data, isLoading } = useLevelMasterSheet(competitionId, levelId);

  const profileMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of data?.profiles || []) {
      m.set(p.user_id, p.full_name || p.email || "Unknown");
    }
    return m;
  }, [data?.profiles]);

  const subEventMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const se of data?.subEvents || []) {
      m.set(se.id, se.name);
    }
    return m;
  }, [data?.subEvents]);

  // All unique judge IDs from scores
  const judgeUserIds = useMemo(() => {
    return [...new Set((data?.scores || []).map((s) => s.judge_id as string))];
  }, [data?.scores]);

  // Build rows: one per contestant across all sub-events
  const rows = useMemo(() => {
    if (!data) return [];
    return (data.registrations || [])
      .map((reg) => {
        const regScores = data.scores.filter((s) => s.contestant_registration_id === reg.id);
        const judgeScores: Record<string, { final: number; certified: boolean }> = {};
        for (const s of regScores) {
          judgeScores[s.judge_id] = { final: s.final_score, certified: s.is_certified };
        }
        const certifiedScores = regScores.filter((s) => s.is_certified);
        const total = certifiedScores.reduce((a, s) => a + s.final_score, 0);
        const avgFinal = certifiedScores.length > 0 ? total / certifiedScores.length : 0;
        return {
          regId: reg.id,
          name: reg.full_name,
          userId: reg.user_id,
          subEventId: reg.sub_event_id,
          judgeScores,
          total,
          avgFinal,
          certifiedCount: certifiedScores.length,
          totalJudges: regScores.length,
        };
      })
      .sort((a, b) => b.avgFinal - a.avgFinal || b.total - a.total);
  }, [data]);

  // Build exportable rows
  const exportRows = useMemo((): SheetRow[] => {
    return rows.map((r, i) => {
      const row: SheetRow = { Rank: i + 1, Contestant: r.name, "Sub-Event": subEventMap.get(r.subEventId || "") || "—" };
      for (const jId of judgeUserIds) {
        const js = r.judgeScores[jId];
        row[profileMap.get(jId) || "Judge"] = js ? Number(js.final.toFixed(2)) : 0;
      }
      row["Total"] = Number(r.total.toFixed(2));
      row["Avg Final"] = Number(r.avgFinal.toFixed(2));
      return row;
    });
  }, [rows, judgeUserIds, profileMap, subEventMap]);

  const exportFilename = `level-sheet-${data?.level?.name || "export"}`.replace(/\s+/g, "-").toLowerCase();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!data?.level) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <p className="text-muted-foreground">Level not found.</p>
        <Button asChild variant="ghost" size="sm" className="mt-2">
          <Link to="/judging">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Judging Hub
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-4 flex items-center justify-between print:mb-2">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="shrink-0 print:hidden">
            <Link to="/judging">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Level Master Sheet
            </h1>
            <p className="text-sm text-muted-foreground">
              {data.level.name} • {data.subEvents.length} sub-event{data.subEvents.length !== 1 ? "s" : ""} combined
            </p>
          </div>
        </div>
        {canExport && <ExportDropdown rows={exportRows} filename={exportFilename} sheetName="Level Sheet" />}
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {rows.length} Contestant{rows.length !== 1 ? "s" : ""} • {judgeUserIds.length} Judge{judgeUserIds.length !== 1 ? "s" : ""}
          </CardTitle>
          <CardDescription>
            Overall ranking across all sub-events in this level. Each column shows the judge's final score.
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
                          className="hover:text-primary hover:underline transition-colors"
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
