import { RubricCriterion, PenaltyRule, Infraction, RubricScaleLabels } from "@/hooks/useCompetitions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Info, Clock, AlertTriangle, Ban, Star } from "lucide-react";

const DEFAULT_SCALE_LABELS: RubricScaleLabels = {
  min: 1,
  max: 5,
  labels: { "1": "Very Weak", "2": "Weak", "3": "Average", "4": "Good", "5": "Excellent" },
};

interface PublicRubricProps {
  criteria: RubricCriterion[];
  penalties: PenaltyRule[];
  infractions?: Infraction[];
  scaleLabels?: RubricScaleLabels;
  scoringMethod?: string;
  weightMode?: "percent" | "points";
}

export function PublicRubric({ criteria, penalties, infractions, scaleLabels, scoringMethod, weightMode = "percent" }: PublicRubricProps) {
  const labels = scaleLabels || DEFAULT_SCALE_LABELS;
  const scaleMin = labels.min || 1;
  const scaleMax = labels.max || 5;
  const scalePoints = Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i);
  const generalPenalties = infractions?.filter(i => i.category === "penalty") || [];
  const disqualifications = infractions?.filter(i => i.category === "disqualification") || [];
  const isWeighted = scoringMethod === "weighted_category";
  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight_percent || 0), 0);

  return (
    <div className="space-y-8">
      {/* Scoring Rubric */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold font-mono">Scoring Rubric</h3>
        </div>

        {isWeighted && totalWeight > 0 && (
          <p className="text-xs text-muted-foreground">
            Scores are weighted by category. Total {weightMode === "percent" ? "weight" : "points"}: {totalWeight}{weightMode === "percent" ? "%" : " pts"}
          </p>
        )}

        <div className="grid gap-4">
          {criteria.map((criterion) => (
            <Card key={criterion.id} className={`border-border/50 bg-card/80 ${criterion.is_bonus ? "ring-1 ring-amber-500/30" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{criterion.name}</CardTitle>
                    {criterion.is_bonus && (
                      <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/40 text-amber-600">
                        <Star className="h-2.5 w-2.5" /> Bonus
                      </Badge>
                    )}
                  </div>
                  {(isWeighted || weightMode === "points") && criterion.weight_percent > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {criterion.weight_percent}{weightMode === "percent" ? "%" : " pts"}
                    </Badge>
                  )}
                </div>
                {criterion.guidelines && (
                  <p className="text-sm text-muted-foreground mt-1">{criterion.guidelines}</p>
                )}
                <CardDescription className="text-xs">
                  Judged on a scale of {scaleMin}–{scaleMax}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`grid grid-cols-1 sm:grid-cols-${Math.min(scalePoints.length, 5)} gap-2`} style={{ gridTemplateColumns: `repeat(${scalePoints.length}, minmax(0, 1fr))` }}>
                  {scalePoints.map((level) => {
                    const desc = level <= 5
                      ? (criterion as any)[`description_${level}`]
                      : criterion.scale_descriptions?.[String(level)];
                    const pts = criterion.point_values?.[String(level)];
                    return (
                      <div key={level} className="flex flex-col gap-1 p-2 rounded bg-muted/30 border border-border/30">
                        <span className="text-xs font-bold font-mono text-primary">{level}</span>
                        <span className="text-[10px] font-medium text-foreground/70">
                          {labels.labels?.[String(level)] || `Level ${level}`}
                        </span>
                        {pts != null && pts > 0 && (
                          <span className="text-[9px] font-mono text-secondary">{pts} pts</span>
                        )}
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {desc || ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {criterion.notes && (
                  <p className="text-[10px] text-muted-foreground/70 mt-2 italic">{criterion.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
          {criteria.length === 0 && (
            <p className="text-sm text-muted-foreground italic py-4">No rubric criteria defined for this competition.</p>
          )}
        </div>
      </section>

      {/* Time Penalties */}
      {penalties.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-secondary" />
            <h3 className="text-lg font-bold font-mono">Time Penalties</h3>
          </div>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs uppercase font-mono">Condition</TableHead>
                      <TableHead className="text-xs uppercase font-mono text-right">Penalty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {penalties.map((rule) => {
                      const timeLimit = Math.floor(rule.time_limit_seconds / 60) + ":" + (rule.time_limit_seconds % 60).toString().padStart(2, "0");
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
              </div>
              <div className="mt-4 flex items-start gap-2 p-3 rounded bg-secondary/10 border border-secondary/20">
                <AlertTriangle className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  A grace period of {penalties[0].grace_period_seconds} seconds applies before penalties are calculated.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* General Penalties */}
      {generalPenalties.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-bold font-mono">General Penalties</h3>
          </div>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
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
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Disqualifications */}
      {disqualifications.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            <h3 className="text-lg font-bold font-mono">Disqualification Rules</h3>
          </div>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="pt-6 space-y-3">
              {disqualifications.map((d) => (
                <div key={d.id} className="flex items-start gap-3 p-3 rounded bg-destructive/5 border border-destructive/15">
                  <Ban className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-foreground">{d.title}</span>
                    {d.description && <p className="text-xs text-muted-foreground leading-relaxed">{d.description}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
