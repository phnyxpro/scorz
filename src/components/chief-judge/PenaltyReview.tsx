import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Check, Pencil } from "lucide-react";
import { calculateOlympic } from "@/lib/scoring-methods";
import type { JudgeScore } from "@/hooks/useJudgeScores";

interface ContestantPenaltyRow {
  regId: string;
  duration: number | null;
  allJudgesRawTotal: number;
  timePenalty: number;
  finalScore: number;
  judgeCount: number;
}

interface PenaltyReviewProps {
  allScores: JudgeScore[];
  contestantName: (regId: string) => string;
  contestantUserId?: (regId: string) => string | undefined;
  isCertified: boolean;
  onAdjust: (regId: string, newPenalty: number) => void;
  isAdjusting: boolean;
}

export function PenaltyReview({ allScores, contestantName, contestantUserId, isCertified, onAdjust, isAdjusting }: PenaltyReviewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Group by contestant and compute per-contestant aggregates
  const rows = useMemo<ContestantPenaltyRow[]>(() => {
    const grouped: Record<string, JudgeScore[]> = {};
    for (const s of allScores) {
      if (!grouped[s.contestant_registration_id]) grouped[s.contestant_registration_id] = [];
      grouped[s.contestant_registration_id].push(s);
    }

    return Object.entries(grouped)
      .map(([regId, scores]) => {
        // Use the max performance_duration_seconds across all judge scores as the canonical duration
        const durations = scores
          .map((s) => s.performance_duration_seconds)
          .filter((d): d is number => d != null && d > 0);
        const duration = durations.length > 0 ? Math.max(...durations) : null;

        // The time penalty is the same for all judges for a given contestant — take the max
        const timePenalty = Math.max(...scores.map((s) => s.time_penalty), 0);

        // Sum all judges' raw totals
        const allJudgesRawTotal = scores.reduce((sum, s) => sum + s.raw_total, 0);

        // Calculate Olympic final using raw_totals array and single penalty
        const rawTotals = scores.map((s) => s.raw_total);
        const finalScore = calculateOlympic(rawTotals, timePenalty);

        return {
          regId,
          duration,
          allJudgesRawTotal,
          timePenalty,
          finalScore,
          judgeCount: scores.length,
        };
      })
      .filter((r) => r.timePenalty > 0 || (r.duration != null && r.duration > 0))
      .sort((a, b) => b.timePenalty - a.timePenalty || a.regId.localeCompare(b.regId));
  }, [allScores]);

  if (rows.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">No time penalties triggered for this sub-event.</p>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (secs: number | null) => {
    if (!secs) return "–";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Penalty Review</CardTitle>
        <CardDescription>
          Per-contestant time penalties. Penalty is subtracted once from the combined judge totals before averaging.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Contestant</TableHead>
                <TableHead className="text-xs text-center">Duration</TableHead>
                <TableHead className="text-xs text-center">All Judges Raw Total</TableHead>
                <TableHead className="text-xs text-center">Penalty</TableHead>
                <TableHead className="text-xs text-center">Final Score</TableHead>
                {!isCertified && <TableHead className="text-xs text-center">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.regId}>
                  <TableCell className="text-sm">
                    {contestantUserId?.(row.regId) ? (
                      <Link
                        to={`/profile/${contestantUserId(row.regId)}`}
                        className="hover:text-secondary hover:underline transition-colors"
                      >
                        {contestantName(row.regId)}
                      </Link>
                    ) : (
                      contestantName(row.regId)
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {formatDuration(row.duration)}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {row.allJudgesRawTotal.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    {editingId === row.regId ? (
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-20 mx-auto text-center h-8 text-sm"
                        min={0}
                      />
                    ) : (
                      <Badge
                        className={
                          row.timePenalty > 0
                            ? "bg-destructive/20 text-destructive"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {row.timePenalty > 0 && <AlertTriangle className="h-3 w-3 mr-1" />}
                        -{row.timePenalty}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-primary text-sm">
                    {row.finalScore.toFixed(2)}
                  </TableCell>
                  {!isCertified && (
                    <TableCell className="text-center">
                      {editingId === row.regId ? (
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="default"
                            disabled={isAdjusting}
                            onClick={() => {
                              onAdjust(row.regId, Number(editValue) || 0);
                              setEditingId(null);
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingId(row.regId);
                            setEditValue(String(row.timePenalty));
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
