import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import type { JudgeScore } from "@/hooks/useJudgeScores";
import { calculateMethodScore } from "@/lib/scoring-methods";
import { getAvgDuration } from "@/hooks/usePerformanceTimer";

interface PerformanceDuration {
  id: string;
  sub_event_id: string;
  contestant_registration_id: string;
  tabulator_id: string;
  duration_seconds: number;
}

interface Props {
  scoresByContestant: Record<string, JudgeScore[]>;
  contestantName: (id: string) => string;
  contestantUserId?: (id: string) => string | undefined;
  rubricNames: string[];
  indexToName?: Record<string, string>;
  scoringMethod?: string;
  durations?: PerformanceDuration[];
}

function formatDuration(secs: number): string {
  if (secs <= 0) return "—";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ScoreSummaryTable({ scoresByContestant, contestantName, contestantUserId, rubricNames, indexToName = {}, scoringMethod = "olympic", durations }: Props) {
  const rows = useMemo(() => {
    return Object.entries(scoresByContestant)
      .map(([regId, scores]) => {
        const certifiedScores = scores.filter((s) => s.is_certified);
        const allCertified = scores.length > 0 && scores.every((s) => s.is_certified);
        const judgeCount = scores.length;

        const criterionAvgs: Record<string, number> = {};
        if (scores.length > 0) {
          for (const s of scores) {
            const cs = s.criterion_scores as Record<string, number>;
            for (const [k, v] of Object.entries(cs)) {
              const name = indexToName[k] ?? k;
              criterionAvgs[name] = (criterionAvgs[name] || 0) + v;
            }
          }
          for (const k of Object.keys(criterionAvgs)) {
            criterionAvgs[k] = criterionAvgs[k] / scores.length;
          }
        }

        const rawTotals = scores.map((s) => s.raw_total);
        const avgPenalty =
          scores.length > 0
            ? scores.reduce((a, s) => a + s.time_penalty, 0) / scores.length
            : 0;
        const avgFinal = scores.length > 0
          ? calculateMethodScore(scoringMethod, rawTotals, avgPenalty)
          : 0;

        const avgDur = durations ? getAvgDuration(durations, regId) : 0;

        return {
          regId,
          name: contestantName(regId),
          judgeCount,
          certifiedCount: certifiedScores.length,
          allCertified,
          criterionAvgs,
          avgPenalty,
          avgFinal,
          avgDuration: avgDur,
        };
      })
      .sort((a, b) => b.avgFinal - a.avgFinal);
  }, [scoresByContestant, contestantName, scoringMethod, durations]);

  const [page, setPage] = useState(0);
  const pageSize = 5;
  const totalPages = Math.ceil(rows.length / pageSize);
  const pagedRows = rows.slice(page * pageSize, (page + 1) * pageSize);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">No scores submitted yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Contestant</TableHead>
              <TableHead className="text-center">Judges</TableHead>
              {rubricNames.map((n) => (
                <TableHead key={n} className="text-center text-xs">
                  {n}
                </TableHead>
              ))}
              <TableHead className="text-center text-xs">Duration</TableHead>
              <TableHead className="text-center">Penalty</TableHead>
              <TableHead className="text-center font-bold">Final Avg</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRows.map((r) => {
              const globalIdx = rows.indexOf(r);
              return (
                <TableRow key={r.regId}>
                  <TableCell className="font-mono text-muted-foreground">{globalIdx + 1}</TableCell>
                  <TableCell className="font-medium">
                    {contestantUserId ? (
                      <Link to={`/profile/${contestantUserId(r.regId) || ""}`} className="hover:text-secondary hover:underline transition-colors">
                        {r.name}
                      </Link>
                    ) : r.name}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1.5">
                        {r.certifiedCount > 0 && (
                          <Badge variant="secondary" className="px-1 py-0 h-5 gap-1 text-[10px]">
                            <CheckCircle className="h-2.5 w-2.5" /> {r.certifiedCount}
                          </Badge>
                        )}
                        {r.judgeCount - r.certifiedCount > 0 && (
                          <Badge variant="outline" className="px-1 py-0 h-5 gap-1 text-[10px] border-amber-500/50 text-amber-500">
                            <Clock className="h-2.5 w-2.5" /> {r.judgeCount - r.certifiedCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  {rubricNames.map((n) => (
                    <TableCell key={n} className="text-center font-mono text-xs">
                      {r.criterionAvgs[n] != null ? r.criterionAvgs[n].toFixed(2) : "—"}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-mono text-xs">{formatDuration(r.avgDuration)}</TableCell>
                  <TableCell className="text-center font-mono text-xs text-destructive">
                    {r.avgPenalty > 0 ? `-${r.avgPenalty.toFixed(1)}` : "0"}
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold">{r.avgFinal.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    {r.allCertified ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle className="h-3 w-3" /> Ready
                      </Badge>
                    ) : r.judgeCount > 0 ? (
                      <Badge variant="outline" className="gap-1 animate-pulse border-amber-500/50 text-amber-500">
                        <Clock className="h-3 w-3" /> In Progress
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground opacity-50 border-none">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
          </Button>
          <span className="text-xs text-muted-foreground font-mono">
            {page + 1} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
