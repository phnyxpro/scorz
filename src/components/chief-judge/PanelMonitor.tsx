import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, Clock, Edit, ShieldCheck, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
    return (
      <Badge variant="outline" className="text-muted-foreground border-muted/50 font-normal">
        <Clock className="h-3 w-3 mr-1 opacity-50" /> Pending
      </Badge>
    );
  }
  if (score.is_certified) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
        <ShieldCheck className="h-3 w-3 mr-1" /> Certified
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium">
      <Edit className="h-3 w-3 mr-1" /> Submitted
    </Badge>
  );
}

export function PanelMonitor({ scoresByContestant, judgeIds, contestantName, contestantUserId, isCertified, contestantAverages }: PanelMonitorProps) {
  const contestantIds = Object.keys(scoresByContestant);
  const totalRequired = contestantIds.length * judgeIds.length;
  const currentTotal = Object.values(scoresByContestant).reduce((a, b) => a + b.length, 0);
  const progressPercent = totalRequired > 0 ? (currentTotal / totalRequired) * 100 : 0;

  if (contestantIds.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="py-12 text-center">
          <Activity className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground text-sm font-medium">Awaiting first scores...</p>
          <p className="text-[10px] text-muted-foreground mt-1">The panel monitor will update automatically as scores arrive.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Panel Monitoring
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </CardTitle>
              <CardDescription>
                Real-time scoring progress for this sub-event.
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold font-mono text-primary">
                {Math.round(progressPercent)}% COMPLETE
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                {currentTotal} / {totalRequired} Cards
              </div>
            </div>
          </div>
          <Progress value={progressPercent} className="h-1.5 mt-4" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border/50 bg-background/50">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3">Contestant</TableHead>
                  {judgeIds.map((jid, i) => (
                    <TableHead key={jid} className="text-[10px] uppercase font-bold tracking-wider py-3 text-center">
                      Judge {i + 1}
                    </TableHead>
                  ))}
                  {isCertified && <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 text-center">Avg</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {contestantIds.map(regId => {
                  const scores = scoresByContestant[regId] || [];
                  const avg = contestantAverages.find(c => c.regId === regId)?.avg;
                  return (
                    <TableRow key={regId} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-sm font-semibold truncate max-w-[150px]">
                        {contestantUserId?.(regId) ? (
                          <Link to={`/profile/${contestantUserId(regId)}`} className="hover:text-secondary transition-colors">
                            {contestantName(regId)}
                          </Link>
                        ) : contestantName(regId)}
                      </TableCell>
                      {judgeIds.map(jid => {
                        const score = scores.find(s => s.judge_id === jid);
                        return (
                          <TableCell key={jid} className="text-center py-2 px-1">
                            <ScoreStatusBadge score={score} />
                          </TableCell>
                        );
                      })}
                      {isCertified && (
                        <TableCell className="text-center py-2 px-1">
                          <span className="font-mono text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded">
                            {avg?.toFixed(2) ?? "–"}
                          </span>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-6">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-muted-foreground uppercase font-medium">Certified</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-[10px] text-muted-foreground uppercase font-medium">Draft/Submitted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full border border-muted" />
          <span className="text-[10px] text-muted-foreground uppercase font-medium">Pending</span>
        </div>
      </div>
    </div>
  );
}
