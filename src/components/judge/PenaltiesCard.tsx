import { usePenaltyRules, useInfractions } from "@/hooks/useCompetitions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, AlertTriangle, Ban } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PenaltiesCardProps {
  competitionId: string;
}

export function PenaltiesCard({ competitionId }: PenaltiesCardProps) {
  const { data: penalties, isLoading: penaltiesLoading } = usePenaltyRules(competitionId);
  const { data: infractions, isLoading: infractionsLoading } = useInfractions(competitionId);

  const isLoading = penaltiesLoading || infractionsLoading;
  const generalPenalties = infractions?.filter(i => i.category === "penalty") || [];
  const disqualifications = infractions?.filter(i => i.category === "disqualification") || [];

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const hasPenalties = (penalties && penalties.length > 0) || generalPenalties.length > 0 || disqualifications.length > 0;

  if (!hasPenalties) return null;

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-secondary" /> Penalties & Disqualifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="time" className="space-y-3">
          <TabsList className="w-full">
            {penalties && penalties.length > 0 && (
              <TabsTrigger value="time" className="text-xs flex-1 gap-1">
                <Clock className="h-3 w-3" /> Time
              </TabsTrigger>
            )}
            {generalPenalties.length > 0 && (
              <TabsTrigger value="general" className="text-xs flex-1 gap-1">
                <AlertTriangle className="h-3 w-3" /> General
              </TabsTrigger>
            )}
            {disqualifications.length > 0 && (
              <TabsTrigger value="dq" className="text-xs flex-1 gap-1">
                <Ban className="h-3 w-3" /> DQ Rules
              </TabsTrigger>
            )}
          </TabsList>

          {/* Time Penalties */}
          {penalties && penalties.length > 0 && (
            <TabsContent value="time" className="mt-0">
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
              <div className="mt-3 flex items-start gap-2 p-3 rounded bg-secondary/10 border border-secondary/20">
                <AlertTriangle className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  A grace period of {penalties[0].grace_period_seconds} seconds applies before penalties are calculated.
                </p>
              </div>
            </TabsContent>
          )}

          {/* General Penalties */}
          {generalPenalties.length > 0 && (
            <TabsContent value="general" className="mt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs uppercase font-mono">Violation</TableHead>
                    <TableHead className="text-xs uppercase font-mono text-right">Penalty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generalPenalties.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="text-sm font-medium">{p.title}</span>
                          {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <Badge variant="destructive" className="font-mono">
                          -{p.penalty_points} pts
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          )}

          {/* Disqualifications */}
          {disqualifications.length > 0 && (
            <TabsContent value="dq" className="mt-0">
              <div className="space-y-3">
                {disqualifications.map((d) => (
                  <div key={d.id} className="flex items-start gap-3 p-3 rounded bg-destructive/5 border border-destructive/15">
                    <Ban className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium text-foreground">{d.title}</span>
                      {d.description && <p className="text-xs text-muted-foreground leading-relaxed">{d.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
