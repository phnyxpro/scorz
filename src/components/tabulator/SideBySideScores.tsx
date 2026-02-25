import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock } from "lucide-react";
import type { JudgeScore } from "@/hooks/useJudgeScores";

interface Props {
  scores: JudgeScore[];
  rubricNames: string[];
  contestantName: string;
}

export function SideBySideScores({ scores, rubricNames, contestantName }: Props) {
  if (scores.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-foreground">{contestantName}</h4>
      <div className="overflow-x-auto border border-border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judge</TableHead>
              {rubricNames.map((n) => (
                <TableHead key={n} className="text-center text-xs">{n}</TableHead>
              ))}
              <TableHead className="text-center">Raw</TableHead>
              <TableHead className="text-center">Penalty</TableHead>
              <TableHead className="text-center font-bold">Final</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scores.map((s) => {
              const cs = s.criterion_scores as Record<string, number>;
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.judge_id.slice(0, 8)}…</TableCell>
                  {rubricNames.map((n) => (
                    <TableCell key={n} className="text-center font-mono text-xs">
                      {cs[n] != null ? cs[n] : "—"}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-mono text-xs">{s.raw_total}</TableCell>
                  <TableCell className="text-center font-mono text-xs text-destructive">
                    {s.time_penalty > 0 ? `-${s.time_penalty}` : "0"}
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold">{s.final_score}</TableCell>
                  <TableCell className="text-center">
                    {s.is_certified ? (
                      <CheckCircle className="h-3.5 w-3.5 text-secondary inline-block" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-muted-foreground inline-block" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {/* Average row */}
            <TableRow className="bg-muted/30 font-semibold">
              <TableCell className="text-xs">Average</TableCell>
              {rubricNames.map((n) => {
                const vals = scores.filter(s => s.is_certified).map(s => (s.criterion_scores as Record<string, number>)[n]).filter(v => v != null);
                const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                return (
                  <TableCell key={n} className="text-center font-mono text-xs">
                    {vals.length > 0 ? avg.toFixed(2) : "—"}
                  </TableCell>
                );
              })}
              <TableCell className="text-center font-mono text-xs">
                {scores.filter(s => s.is_certified).length > 0
                  ? (scores.filter(s => s.is_certified).reduce((a, s) => a + s.raw_total, 0) / scores.filter(s => s.is_certified).length).toFixed(2)
                  : "—"}
              </TableCell>
              <TableCell className="text-center font-mono text-xs text-destructive">
                {scores.filter(s => s.is_certified).length > 0
                  ? (scores.filter(s => s.is_certified).reduce((a, s) => a + s.time_penalty, 0) / scores.filter(s => s.is_certified).length).toFixed(1)
                  : "—"}
              </TableCell>
              <TableCell className="text-center font-mono font-bold">
                {scores.filter(s => s.is_certified).length > 0
                  ? (scores.filter(s => s.is_certified).reduce((a, s) => a + s.final_score, 0) / scores.filter(s => s.is_certified).length).toFixed(2)
                  : "—"}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
