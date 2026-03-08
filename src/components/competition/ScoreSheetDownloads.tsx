import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, Sheet, Loader2, Eye, FileDown, Upload, Files } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { exportMultiSheetXLSX, exportGoogleSheets, type SheetRow } from "@/lib/export-utils";
import { ScoreSheetPreviewModal } from "./ScoreSheetPreviewModal";
import { ScoreImportDialog } from "./ScoreImportDialog";
import { BulkScoreImportDialog } from "./BulkScoreImportDialog";
import { resolveStaffNames } from "@/hooks/useStaffDisplayNames";

interface ScoreSheetDownloadsProps {
  competitionId: string;
  levels: { id: string; name: string }[];
  subEvents: { id: string; name: string; level_id: string; status: string }[];
}

export interface PenaltyRule {
  from_seconds: number;
  to_seconds: number | null;
  penalty_points: number;
}

export interface FetchedData {
  contestants: { id: string; full_name: string; sort_order: number }[];
  scores: {
    id: string;
    judge_id: string;
    contestant_registration_id: string;
    criterion_scores: Record<string, number>;
    raw_total: number;
  }[];
  criteria: { id: string; name: string; sort_order: number }[];
  judgeProfiles: Record<string, string>;
  timerData: Record<string, number>;
  penaltyRules: PenaltyRule[];
  assignedJudges: { user_id: string; name: string }[];
}

export interface PreviewData {
  subEventName: string;
  fetched: FetchedData;
  masterRows: SheetRow[];
  judgeSheets: { name: string; judgeId: string; rows: SheetRow[] }[];
}

function formatTime(seconds: number | undefined): string {
  if (seconds === undefined || seconds === null) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const whole = Math.floor(secs);
  const frac = Math.round((secs - whole) * 100);
  return `${mins}:${String(whole).padStart(2, "0")}.${String(frac).padStart(2, "0")}`;
}

function computePenalty(elapsedSeconds: number | undefined, rules: PenaltyRule[]): number {
  if (elapsedSeconds === undefined || elapsedSeconds === null || rules.length === 0) return 0;
  for (const rule of rules) {
    const matchFrom = elapsedSeconds >= rule.from_seconds;
    const matchTo = rule.to_seconds === null || elapsedSeconds <= rule.to_seconds;
    if (matchFrom && matchTo) return Number(rule.penalty_points);
  }
  return 0;
}

async function fetchSubEventData(competitionId: string, subEventId: string): Promise<FetchedData> {
  const [contestantsRes, scoresRes, criteriaRes, timerRes, penaltyRes, assignmentsRes] = await Promise.all([
    supabase
      .from("contestant_registrations")
      .select("id, full_name, sort_order")
      .eq("competition_id", competitionId)
      .eq("sub_event_id", subEventId)
      .eq("status", "approved")
      .order("sort_order"),
    supabase
      .from("judge_scores")
      .select("id, judge_id, contestant_registration_id, criterion_scores, raw_total")
      .eq("sub_event_id", subEventId),
    supabase
      .from("rubric_criteria")
      .select("id, name, sort_order")
      .eq("competition_id", competitionId)
      .order("sort_order"),
    supabase
      .from("performance_timer_events")
      .select("contestant_registration_id, elapsed_seconds")
      .eq("sub_event_id", subEventId)
      .eq("event_type", "stop"),
    supabase
      .from("penalty_rules")
      .select("from_seconds, to_seconds, penalty_points")
      .eq("competition_id", competitionId)
      .order("sort_order"),
    supabase
      .from("sub_event_assignments")
      .select("user_id")
      .eq("sub_event_id", subEventId)
      .eq("role", "judge"),
  ]);

  if (contestantsRes.error) throw contestantsRes.error;
  if (scoresRes.error) throw scoresRes.error;
  if (criteriaRes.error) throw criteriaRes.error;
  if (timerRes.error) throw timerRes.error;
  if (penaltyRes.error) throw penaltyRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;

  // Build timer data map — use last stop event per contestant
  const timerData: Record<string, number> = {};
  for (const t of timerRes.data || []) {
    if (t.elapsed_seconds !== null) {
      timerData[t.contestant_registration_id] = Number(t.elapsed_seconds);
    }
  }

  // Merge judge IDs from scores + assignments
  const assignedJudgeIds = (assignmentsRes.data || []).map((a) => a.user_id);
  const scoreJudgeIds = [...new Set((scoresRes.data || []).map((s) => s.judge_id))];
  const allJudgeIds = [...new Set([...assignedJudgeIds, ...scoreJudgeIds])];
  const judgeProfiles: Record<string, string> = {};

  if (allJudgeIds.length > 0) {
    const resolved = await resolveStaffNames(allJudgeIds);
    for (const [uid, name] of Object.entries(resolved)) {
      judgeProfiles[uid] = name;
    }
  }

  const assignedJudges = assignedJudgeIds.map((uid) => ({
    user_id: uid,
    name: judgeProfiles[uid] || "Unknown Judge",
  }));

  return {
    contestants: contestantsRes.data || [],
    scores: (scoresRes.data || []).map((s) => ({
      ...s,
      criterion_scores: (s.criterion_scores as Record<string, number>) || {},
      raw_total: Number(s.raw_total),
    })),
    criteria: criteriaRes.data || [],
    judgeProfiles,
    timerData,
    penaltyRules: (penaltyRes.data || []).map((r) => ({
      from_seconds: r.from_seconds,
      to_seconds: r.to_seconds,
      penalty_points: Number(r.penalty_points),
    })),
    assignedJudges,
  };
}

export function buildMasterSheet(data: FetchedData): SheetRow[] {
  const { contestants, scores, judgeProfiles, timerData, penaltyRules } = data;
  const judgeIds = [...new Set(scores.map((s) => s.judge_id))];

  return contestants
    .map((c) => {
      const row: SheetRow = { "#": c.sort_order, Contestant: c.full_name };

      const elapsed = timerData[c.id];
      row["TIME"] = elapsed !== undefined ? formatTime(elapsed) : "—";

      const contestantScores = scores.filter((s) => s.contestant_registration_id === c.id);
      const rawTotals: number[] = [];

      for (const jId of judgeIds) {
        const js = contestantScores.find((s) => s.judge_id === jId);
        const judgeName = judgeProfiles[jId] || jId.slice(0, 8);
        const val = js ? js.raw_total : 0;
        row[judgeName] = val;
        if (js) rawTotals.push(val);
      }

      const total = rawTotals.reduce((a, b) => a + b, 0);
      const min = rawTotals.length > 0 ? Math.min(...rawTotals) : 0;
      const max = rawTotals.length > 0 ? Math.max(...rawTotals) : 0;
      const penalty = computePenalty(elapsed, penaltyRules);

      let finalScore = 0;
      if (rawTotals.length > 2) {
        finalScore = Math.round(((total - min - max) / (rawTotals.length - 2) - penalty) * 100) / 100;
      } else if (rawTotals.length > 0) {
        finalScore = Math.round((total / rawTotals.length - penalty) * 100) / 100;
      }

      row["Total"] = total;
      row["MIN"] = min;
      row["MAX"] = max;
      row["Penalty"] = penalty;
      row["Final Score"] = finalScore;

      return row;
    })
    .sort((a, b) => (Number(b["Final Score"]) || 0) - (Number(a["Final Score"]) || 0))
    .map((row, i) => ({ Rank: i + 1, ...row }));
}

export function buildJudgeSheet(data: FetchedData, judgeId: string): SheetRow[] {
  const { contestants, scores, criteria } = data;
  const judgeScores = scores.filter((s) => s.judge_id === judgeId);

  return contestants.map((c) => {
    const js = judgeScores.find((s) => s.contestant_registration_id === c.id);
    const row: SheetRow = { Contestant: c.full_name };

    for (const crit of criteria) {
      const key = String(crit.sort_order);
      row[crit.name] = js ? (js.criterion_scores[key] ?? "") : "";
    }

    row["Total"] = js ? js.raw_total : "";
    return row;
  });
}

function buildSheets(data: FetchedData) {
  const masterRows = buildMasterSheet(data);
  const judgeIds = [...new Set(data.scores.map((s) => s.judge_id))];
  const judgeSheets = judgeIds.map((jId) => ({
    name: (data.judgeProfiles[jId] || jId.slice(0, 8)).slice(0, 28),
    judgeId: jId,
    rows: buildJudgeSheet(data, jId),
  }));
  return { masterRows, judgeSheets };
}

function buildBlankMasterSheet(data: FetchedData): SheetRow[] {
  const { contestants, assignedJudges } = data;
  return contestants.map((c) => {
    const row: SheetRow = { "#": c.sort_order, Contestant: c.full_name, TIME: "" };
    for (const j of assignedJudges) {
      row[j.name] = "";
    }
    row["Total"] = "";
    row["MIN"] = "";
    row["MAX"] = "";
    row["Penalty"] = "";
    row["Final Score"] = "";
    return row;
  });
}

function buildBlankJudgeSheet(data: FetchedData): SheetRow[] {
  const { contestants, criteria } = data;
  return contestants.map((c) => {
    const row: SheetRow = { Contestant: c.full_name };
    for (const crit of criteria) {
      row[crit.name] = "";
    }
    row["Total"] = "";
    return row;
  });
}


export function ScoreSheetDownloads({ competitionId, levels, subEvents }: ScoreSheetDownloadsProps) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importTarget, setImportTarget] = useState<{ subEventId: string; subEventName: string; data: FetchedData } | null>(null);
  const [bulkImportTarget, setBulkImportTarget] = useState<{ subEventId: string; subEventName: string; data: FetchedData } | null>(null);
  const subEventsByLevel = levels
    .map((level) => ({
      level,
      subs: subEvents.filter((se) => se.level_id === level.id),
    }))
    .filter((g) => g.subs.length > 0);

  const fetchAndBuild = async (subEventId: string) => {
    const data = await fetchSubEventData(competitionId, subEventId);
    if (data.scores.length === 0) {
      toast({ title: "No scores yet", description: "There are no judge scores recorded for this sub-event.", variant: "destructive" });
      return null;
    }
    const { masterRows, judgeSheets } = buildSheets(data);
    return { fetched: data, masterRows, judgeSheets };
  };

  const handleDownloadExcel = async (subEventId: string, subEventName: string) => {
    setLoading((p) => ({ ...p, [subEventId + "_xlsx"]: true }));
    try {
      const result = await fetchAndBuild(subEventId);
      if (!result) return;
      const sheets = [
        { name: "Master", rows: result.masterRows },
        ...result.judgeSheets.map((js) => ({ name: js.name, rows: js.rows })),
      ];
      exportMultiSheetXLSX(sheets, `${subEventName.replace(/[^a-zA-Z0-9 ]/g, "")}_Scores`);
      toast({ title: "Excel downloaded" });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading((p) => ({ ...p, [subEventId + "_xlsx"]: false }));
    }
  };

  const handleDownloadCSV = async (subEventId: string, subEventName: string) => {
    setLoading((p) => ({ ...p, [subEventId + "_csv"]: true }));
    try {
      const result = await fetchAndBuild(subEventId);
      if (!result) return;
      exportGoogleSheets(result.masterRows, `${subEventName.replace(/[^a-zA-Z0-9 ]/g, "")}_Scores`);
      toast({ title: "CSV downloaded", description: "Open in Google Sheets for best results" });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading((p) => ({ ...p, [subEventId + "_csv"]: false }));
    }
  };

  const handlePreview = async (subEventId: string, subEventName: string) => {
    setLoading((p) => ({ ...p, [subEventId + "_preview"]: true }));
    try {
      const result = await fetchAndBuild(subEventId);
      if (!result) return;
      setPreviewData({ subEventName, ...result });
    } catch (err: any) {
      toast({ title: "Preview failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading((p) => ({ ...p, [subEventId + "_preview"]: false }));
    }
  };

  const handleBlankTemplate = async (subEventId: string, subEventName: string) => {
    setLoading((p) => ({ ...p, [subEventId + "_blank"]: true }));
    try {
      const data = await fetchSubEventData(competitionId, subEventId);
      if (data.assignedJudges.length === 0) {
        toast({ title: "No judges assigned", description: "Assign judges to this sub-event first.", variant: "destructive" });
        return;
      }
      const masterRows = buildBlankMasterSheet(data);
      const judgeSheets = data.assignedJudges.map((j) => ({
        name: j.name.slice(0, 28),
        rows: buildBlankJudgeSheet(data),
      }));
      const sheets = [
        { name: "Master", rows: masterRows },
        ...judgeSheets.map((js) => ({ name: js.name, rows: js.rows })),
      ];
      exportMultiSheetXLSX(sheets, `${subEventName.replace(/[^a-zA-Z0-9 ]/g, "")}_Blank_Template`);
      toast({ title: "Blank template downloaded" });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading((p) => ({ ...p, [subEventId + "_blank"]: false }));
    }
  };

  const handleImportScores = async (subEventId: string, subEventName: string) => {
    setLoading((p) => ({ ...p, [subEventId + "_import"]: true }));
    try {
      const data = await fetchSubEventData(competitionId, subEventId);
      if (data.assignedJudges.length === 0) {
        toast({ title: "No judges assigned", description: "Assign judges to this sub-event first.", variant: "destructive" });
        return;
      }
      setImportTarget({ subEventId, subEventName, data });
    } catch (err: any) {
      toast({ title: "Failed to load data", description: err.message, variant: "destructive" });
    } finally {
      setLoading((p) => ({ ...p, [subEventId + "_import"]: false }));
    }
  };

  const handleBulkImport = async (subEventId: string, subEventName: string) => {
    setLoading((p) => ({ ...p, [subEventId + "_bulk"]: true }));
    try {
      const data = await fetchSubEventData(competitionId, subEventId);
      if (data.assignedJudges.length === 0) {
        toast({ title: "No judges assigned", description: "Assign judges to this sub-event first.", variant: "destructive" });
        return;
      }
      setBulkImportTarget({ subEventId, subEventName, data });
    } catch (err: any) {
      toast({ title: "Failed to load data", description: err.message, variant: "destructive" });
    } finally {
      setLoading((p) => ({ ...p, [subEventId + "_bulk"]: false }));
    }
  };
  if (subEventsByLevel.length === 0) return null;

  return (
    <>
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Score Sheet Downloads
          </CardTitle>
          <CardDescription>
            Olympic-style multi-tab Excel workbooks or Google Sheets CSVs with master &amp; per-judge score sheets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subEventsByLevel.map(({ level, subs }) => (
            <div key={level.id} className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">{level.name}</h4>
              {subs.map((se) => (
                <div
                  key={se.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-border/30 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{se.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {se.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!!loading[se.id + "_preview"]}
                      onClick={() => handlePreview(se.id, se.name)}
                    >
                      {loading[se.id + "_preview"] ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      ) : (
                        <Eye className="h-4 w-4 mr-1.5" />
                      )}
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!!loading[se.id + "_xlsx"]}
                      onClick={() => handleDownloadExcel(se.id, se.name)}
                    >
                      {loading[se.id + "_xlsx"] ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                      )}
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!!loading[se.id + "_csv"]}
                      onClick={() => handleDownloadCSV(se.id, se.name)}
                    >
                      {loading[se.id + "_csv"] ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      ) : (
                        <Sheet className="h-4 w-4 mr-1.5" />
                      )}
                      Google Sheets
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!!loading[se.id + "_blank"]}
                      onClick={() => handleBlankTemplate(se.id, se.name)}
                    >
                      {loading[se.id + "_blank"] ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      ) : (
                        <FileDown className="h-4 w-4 mr-1.5" />
                      )}
                      Blank Template
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!!loading[se.id + "_import"]}
                      onClick={() => handleImportScores(se.id, se.name)}
                    >
                      {loading[se.id + "_import"] ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      ) : (
                        <Upload className="h-4 w-4 mr-1.5" />
                      )}
                      Import Scores
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      {previewData && (
        <ScoreSheetPreviewModal
          data={previewData}
          open={!!previewData}
          onOpenChange={(open) => !open && setPreviewData(null)}
        />
      )}

      {importTarget && (
        <ScoreImportDialog
          open={!!importTarget}
          onOpenChange={(open) => !open && setImportTarget(null)}
          subEventId={importTarget.subEventId}
          subEventName={importTarget.subEventName}
          fetchedData={importTarget.data}
        />
      )}
    </>
  );
}
