import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, Clock, Edit, ShieldCheck } from "lucide-react";
import type { JudgeScore } from "@/hooks/useJudgeScores";

interface PanelMonitorProps {
  scoresByContestant: Record<string, JudgeScore[]>;
  judgeIds: string[];
  contestantName: (regId: string) => string;
  contestantUserId?: (regId: string) => string | undefined;
  isCertified: boolean;
  contestantAverages: { regId: string; avg: number }[];
}

function ScoreStatusBadge({ score }: { score: JudgeScore | undefined }) {
  if (!score) {
    return <Badge variant="outline" className="text-muted-foreground border-muted"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
  }
  if (score.is_certified) {
    return <Badge className="bg-secondary/20 text-secondary border-secondary/30"><ShieldCheck className="h-3 w-3 mr-1" /> Certified</Badge>;
  }
  return <Badge className="bg-primary/20 text-primary border-primary/30"><Edit className="h-3 w-3 mr-1" /> Submitted</Badge>;
}

export function PanelMonitor({ scoresByContestant, judgeIds, contestantName, contestantUserId, isCertified, contestantAverages }: PanelMonitorProps) {
  const contestantIds = Object.keys(scoresByContestant);

  if (contestantIds.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">No scores submitted yet for this sub-event.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Judge Panel Status</CardTitle>
        <CardDescription>
          Real-time view of judge scoring progress. {!isCertified && "Scores are hidden until certification."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Contestant</TableHead>
                {judgeIds.map((jid, i) => (
                  <TableHead key={jid} className="text-xs text-center">Judge {i + 1}</TableHead>
                ))}
                {isCertified && <TableHead className="text-xs text-center">Average</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contestantIds.map(regId => {
                const scores = scoresByContestant[regId] || [];
                const avg = contestantAverages.find(c => c.regId === regId)?.avg;
                return (
                  <TableRow key={regId}>
                    <TableCell className="text-sm font-medium">
                      {contestantUserId?.(regId) ? (
                        <Link to={`/profile/${contestantUserId(regId)}`} className="hover:text-primary hover:underline transition-colors">
                          {contestantName(regId)}
                        </Link>
                      ) : contestantName(regId)}
                    </TableCell>
                    {judgeIds.map(jid => {
                      const score = scores.find(s => s.judge_id === jid);
                      return (
                        <TableCell key={jid} className="text-center">
                          <ScoreStatusBadge score={score} />
                        </TableCell>
                      );
                    })}
                    {isCertified && (
                      <TableCell className="text-center font-mono font-bold text-primary">
                        {avg?.toFixed(1) ?? "–"}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Summary stats */}
        <div className="flex gap-4 mt-4 pt-3 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{contestantIds.length}</span> contestants
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{judgeIds.length}</span> judges
          </div>
          <div className="text-xs text-muted-foreground">
            Total scorecards: <span className="font-medium text-foreground">
              {Object.values(scoresByContestant).reduce((a, b) => a + b.length, 0)}
            </span> / {contestantIds.length * judgeIds.length}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
