import { useParams, Link } from "react-router-dom";
import { useCompetition, usePenaltyRules } from "@/hooks/useCompetitions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Clock, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PenaltiesPage() {
  const { id: competitionId } = useParams<{ id: string }>();
  const { data: comp, isLoading: compLoading } = useCompetition(competitionId);
  const { data: penalties, isLoading: penaltiesLoading } = usePenaltyRules(competitionId);

  const isLoading = compLoading || penaltiesLoading;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/competitions/${competitionId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Clock className="h-6 w-6 text-secondary" /> Time Penalties
          </h1>
          <p className="text-muted-foreground text-xs">{comp?.name || ""}</p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !penalties || penalties.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No time penalty rules defined for this competition.</p>
      ) : (
        <Card className="border-border/50 bg-card/80">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase font-mono">Condition</TableHead>
                  <TableHead className="text-xs uppercase font-mono text-right">Penalty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {penalties.map((rule) => {
                  const timeLimit = Math.floor(rule.time_limit_seconds / 60) + ":" + (rule.time_limit_seconds % 60).toString().padStart(2, '0');
                  return (
                    <TableRow key={rule.id}>
                      <TableCell className="text-sm">
                        {rule.from_seconds === 0 ? (
                          <span>Up to {rule.to_seconds} seconds over {timeLimit}</span>
                        ) : rule.to_seconds ? (
                          <span>{rule.from_seconds} to {rule.to_seconds} seconds over {timeLimit}</span>
                        ) : (
                          <span>More than {rule.from_seconds} seconds over {timeLimit}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive" className="font-mono">
                          -{rule.penalty_points} pts
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="mt-4 flex items-start gap-2 p-3 rounded bg-secondary/10 border border-secondary/20">
              <AlertTriangle className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                A grace period of {penalties[0].grace_period_seconds} seconds applies before penalties are calculated.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
