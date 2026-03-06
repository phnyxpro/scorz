import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Check } from "lucide-react";
import type { JudgeScore } from "@/hooks/useJudgeScores";

interface PenaltyReviewProps {
  allScores: JudgeScore[];
  contestantName: (regId: string) => string;
  contestantUserId?: (regId: string) => string | undefined;
  isCertified: boolean;
  onAdjust: (scoreId: string, newPenalty: number) => void;
  isAdjusting: boolean;
}

export function PenaltyReview({ allScores, contestantName, contestantUserId, isCertified, onAdjust, isAdjusting }: PenaltyReviewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const scoresWithPenalties = allScores.filter(s => s.time_penalty > 0 || (s.performance_duration_seconds && s.performance_duration_seconds > 0));

  if (scoresWithPenalties.length === 0) {
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
        <CardDescription>Review and optionally adjust auto-calculated time penalties</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Contestant</TableHead>
                <TableHead className="text-xs text-center">Duration</TableHead>
                <TableHead className="text-xs text-center">Raw Total</TableHead>
                <TableHead className="text-xs text-center">Penalty</TableHead>
                <TableHead className="text-xs text-center">Final</TableHead>
                {!isCertified && <TableHead className="text-xs text-center">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {scoresWithPenalties.map(score => (
                <TableRow key={score.id}>
                  <TableCell className="text-sm">
                    {contestantUserId?.(score.contestant_registration_id) ? (
                      <Link to={`/profile/${contestantUserId(score.contestant_registration_id)}`} className="hover:text-secondary hover:underline transition-colors">
                        {contestantName(score.contestant_registration_id)}
                      </Link>
                    ) : contestantName(score.contestant_registration_id)}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {formatDuration(score.performance_duration_seconds)}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">{score.raw_total}</TableCell>
                  <TableCell className="text-center">
                    {editingId === score.id ? (
                      <Input
                        type="number"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="w-20 mx-auto text-center h-8 text-sm"
                        min={0}
                      />
                    ) : (
                      <Badge className={score.time_penalty > 0 ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"}>
                        {score.time_penalty > 0 && <AlertTriangle className="h-3 w-3 mr-1" />}
                        -{score.time_penalty}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-primary text-sm">
                    {score.final_score}
                  </TableCell>
                  {!isCertified && (
                    <TableCell className="text-center">
                      {editingId === score.id ? (
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="default"
                            disabled={isAdjusting}
                            onClick={() => {
                              onAdjust(score.id, Number(editValue) || 0);
                              setEditingId(null);
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(score.id);
                            setEditValue(String(score.time_penalty));
                          }}
                        >
                          Adjust
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
