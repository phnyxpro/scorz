import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock } from "lucide-react";
import type { JudgeScore } from "@/hooks/useJudgeScores";

interface Props {
  scoresByContestant: Record<string, JudgeScore[]>;
  contestantName: (id: string) => string;
  contestantUserId?: (id: string) => string | undefined;
  rubricNames: string[];
}

export function ScoreSummaryTable({ scoresByContestant, contestantName, contestantUserId, rubricNames }: Props) {
  const rows = useMemo(() => {
    return Object.entries(scoresByContestant)
      .map(([regId, scores]) => {
        const certifiedScores = scores.filter((s) => s.is_certified);
        const allCertified = scores.length > 0 && scores.every((s) => s.is_certified);
        const judgeCount = scores.length;

        // Average per criterion across judges
        const criterionAvgs: Record<string, number> = {};
        if (certifiedScores.length > 0) {
          for (const s of certifiedScores) {
            const cs = s.criterion_scores as Record<string, number>;
            for (const [k, v] of Object.entries(cs)) {
              criterionAvgs[k] = (criterionAvgs[k] || 0) + v;
            }
          }
          for (const k of Object.keys(criterionAvgs)) {
            criterionAvgs[k] = criterionAvgs[k] / certifiedScores.length;
          }
        }

        const avgFinal =
          certifiedScores.length > 0
            ? certifiedScores.reduce((a, s) => a + s.final_score, 0) / certifiedScores.length
            : 0;

        const avgPenalty =
          certifiedScores.length > 0
            ? certifiedScores.reduce((a, s) => a + s.time_penalty, 0) / certifiedScores.length
            : 0;

        return {
          regId,
          name: contestantName(regId),
          judgeCount,
          certifiedCount: certifiedScores.length,
          allCertified,
          criterionAvgs,
          avgPenalty,
          avgFinal,
        };
      })
      .sort((a, b) => b.avgFinal - a.avgFinal);
  }, [scoresByContestant, contestantName]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">No scores submitted yet.</p>
    );
  }

  return (
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
            <TableHead className="text-center">Penalty</TableHead>
            <TableHead className="text-center font-bold">Final Avg</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.regId}>
              <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
              <TableCell className="font-medium">
                {contestantUserId ? (
                  <Link to={`/profile/${contestantUserId(r.regId) || ""}`} className="hover:text-primary hover:underline transition-colors">
                    {r.name}
                  </Link>
                ) : r.name}
              </TableCell>
              <TableCell className="text-center font-mono text-xs">
                {r.certifiedCount}/{r.judgeCount}
              </TableCell>
              {rubricNames.map((n) => (
                <TableCell key={n} className="text-center font-mono text-xs">
                  {r.criterionAvgs[n] != null ? r.criterionAvgs[n].toFixed(2) : "—"}
                </TableCell>
              ))}
              <TableCell className="text-center font-mono text-xs text-destructive">
                {r.avgPenalty > 0 ? `-${r.avgPenalty.toFixed(1)}` : "0"}
              </TableCell>
              <TableCell className="text-center font-mono font-bold">{r.avgFinal.toFixed(2)}</TableCell>
              <TableCell className="text-center">
                {r.allCertified ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="h-3 w-3" /> Certified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" /> Pending
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
