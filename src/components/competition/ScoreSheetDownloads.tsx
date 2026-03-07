import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, Sheet, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { exportMultiSheetXLSX, exportGoogleSheets, type SheetRow } from "@/lib/export-utils";

interface ScoreSheetDownloadsProps {
  competitionId: string;
  levels: { id: string; name: string }[];
  subEvents: { id: string; name: string; level_id: string; status: string }[];
}

interface FetchedData {
  contestants: { id: string; full_name: string; sort_order: number }[];
  scores: {
    id: string;
    judge_id: string;
    contestant_registration_id: string;
    criterion_scores: Record<string, number>;
    raw_total: number;
    time_penalty: number;
    final_score: number;
  }[];
  criteria: { id: string; name: string; sort_order: number }[];
  judgeProfiles: Record<string, string>;
}

async function fetchSubEventData(competitionId: string, subEventId: string): Promise<FetchedData> {
  const [contestantsRes, scoresRes, criteriaRes] = await Promise.all([
    supabase
      .from("contestant_registrations")
      .select("id, full_name, sort_order")
      .eq("competition_id", competitionId)
      .eq("sub_event_id", subEventId)
      .eq("status", "approved")
      .order("sort_order"),
    supabase
      .from("judge_scores")
      .select("id, judge_id, contestant_registration_id, criterion_scores, raw_total, time_penalty, final_score")
      .eq("sub_event_id", subEventId),
    supabase
      .from("rubric_criteria")
      .select("id, name, sort_order")
      .eq("competition_id", competitionId)
      .order("sort_order"),
  ]);

  if (contestantsRes.error) throw contestantsRes.error;
  if (scoresRes.error) throw scoresRes.error;
  if (criteriaRes.error) throw criteriaRes.error;

  // Get unique judge IDs and fetch their names
  const judgeIds = [...new Set((scoresRes.data || []).map((s) => s.judge_id))];
  const judgeProfiles: Record<string, string> = {};

  if (judgeIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", judgeIds);
    for (const p of profiles || []) {
      judgeProfiles[p.user_id] = p.full_name || "Unknown Judge";
    }
  }

  return {
    contestants: contestantsRes.data || [],
    scores: (scoresRes.data || []).map((s) => ({
      ...s,
      criterion_scores: (s.criterion_scores as Record<string, number>) || {},
    })),
    criteria: criteriaRes.data || [],
    judgeProfiles,
  };
}

function buildMasterSheet(data: FetchedData): SheetRow[] {
  const { contestants, scores, judgeProfiles } = data;
  const judgeIds = [...new Set(scores.map((s) => s.judge_id))];

  return contestants.map((c) => {
    const row: SheetRow = { "#": c.sort_order, Contestant: c.full_name };
    const contestantScores = scores.filter((s) => s.contestant_registration_id === c.id);

    let totalFinal = 0;
    let count = 0;

    for (const jId of judgeIds) {
      const js = contestantScores.find((s) => s.judge_id === jId);
      const judgeName = judgeProfiles[jId] || jId.slice(0, 8);
      row[judgeName] = js ? Number(js.final_score) : "";
      if (js) {
        totalFinal += Number(js.final_score);
        count++;
      }
    }

    const firstContestantScore = contestantScores[0];
    row["Time Penalty"] = firstContestantScore ? Number(firstContestantScore.time_penalty) : 0;
    row["Total"] = totalFinal;
    row["Average"] = count > 0 ? Math.round((totalFinal / count) * 100) / 100 : 0;

    return row;
  }).sort((a, b) => (Number(b["Average"]) || 0) - (Number(a["Average"]) || 0))
    .map((row, i) => ({ Rank: i + 1, ...row }));
}

function buildJudgeSheet(data: FetchedData, judgeId: string): SheetRow[] {
  const { contestants, scores, criteria } = data;
  const judgeScores = scores.filter((s) => s.judge_id === judgeId);

  return contestants.map((c) => {
    const js = judgeScores.find((s) => s.contestant_registration_id === c.id);
    const row: SheetRow = { Contestant: c.full_name };

    for (const crit of criteria) {
      // criterion_scores uses sort_order index as key
      const key = String(crit.sort_order);
      row[crit.name] = js ? (js.criterion_scores[key] ?? "") : "";
    }

    row["Raw Total"] = js ? Number(js.raw_total) : "";
    row["Time Penalty"] = js ? Number(js.time_penalty) : 0;
    row["Final Score"] = js ? Number(js.final_score) : "";

    return row;
  });
}

export function ScoreSheetDownloads({ competitionId, levels, subEvents }: ScoreSheetDownloadsProps) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const subEventsByLevel = levels
    .map((level) => ({
      level,
      subs: subEvents.filter((se) => se.level_id === level.id),
    }))
    .filter((g) => g.subs.length > 0);

  const handleDownloadExcel = async (subEventId: string, subEventName: string) => {
    setLoading((p) => ({ ...p, [subEventId + "_xlsx"]: true }));
    try {
      const data = await fetchSubEventData(competitionId, subEventId);

      if (data.scores.length === 0) {
        toast({ title: "No scores yet", description: "There are no judge scores recorded for this sub-event.", variant: "destructive" });
        return;
      }

      const masterRows = buildMasterSheet(data);
      const judgeIds = [...new Set(data.scores.map((s) => s.judge_id))];

      const sheets = [{ name: "Master", rows: masterRows }];
      for (const jId of judgeIds) {
        const judgeName = (data.judgeProfiles[jId] || jId.slice(0, 8)).slice(0, 28);
        sheets.push({ name: judgeName, rows: buildJudgeSheet(data, jId) });
      }

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
      const data = await fetchSubEventData(competitionId, subEventId);

      if (data.scores.length === 0) {
        toast({ title: "No scores yet", description: "There are no judge scores recorded for this sub-event.", variant: "destructive" });
        return;
      }

      const masterRows = buildMasterSheet(data);
      exportGoogleSheets(masterRows, `${subEventName.replace(/[^a-zA-Z0-9 ]/g, "")}_Scores`);
      toast({ title: "CSV downloaded", description: "Open in Google Sheets for best results" });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading((p) => ({ ...p, [subEventId + "_csv"]: false }));
    }
  };

  if (subEventsByLevel.length === 0) return null;

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          Score Sheet Downloads
        </CardTitle>
        <CardDescription>
          Download multi-tab Excel workbooks or Google Sheets-compatible CSVs with master &amp; per-judge score sheets
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
                </div>
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
