import { RubricCriterion, PenaltyRule } from "@/hooks/useCompetitions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Info, Clock, AlertTriangle } from "lucide-react";

interface PublicRubricProps {
    criteria: RubricCriterion[];
    penalties: PenaltyRule[];
}

export function PublicRubric({ criteria, penalties }: PublicRubricProps) {
    return (
        <div className="space-y-8">
            {/* Scoring Rubric */}
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-bold font-mono">Scoring Rubric</h3>
                </div>
                <div className="grid gap-4">
                    {criteria.map((criterion) => (
                        <Card key={criterion.id} className="border-border/50 bg-card/80">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">{criterion.name}</CardTitle>
                                <CardDescription className="text-xs">
                                    Judged on a scale of 1-5
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                                    {[1, 2, 3, 4, 5].map((level) => (
                                        <div key={level} className="flex flex-col gap-1 p-2 rounded bg-muted/30 border border-border/30">
                                            <span className="text-[10px] font-bold text-primary">Level {level}</span>
                                            <p className="text-[10px] text-muted-foreground leading-tight">
                                                {(criterion as any)[`description_${level}`]}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {criteria.length === 0 && (
                        <p className="text-sm text-muted-foreground italic py-4">No rubric criteria defined for this competition.</p>
                    )}
                </div>
            </section>

            {/* Penalty Rules */}
            {penalties.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-secondary" />
                        <h3 className="text-lg font-bold font-mono">Time Penalties</h3>
                    </div>
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
                </section>
            )}
        </div>
    );
}
