import { useState, useCallback } from "react";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { usePenaltyRules, useInfractions } from "@/hooks/useCompetitions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, AlertTriangle, Ban } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const categories = {
  time: { label: "Time Penalties", icon: Clock },
  general: { label: "General Penalties", icon: AlertTriangle },
  dq: { label: "DQ Rules", icon: Ban },
} as const;

type Category = keyof typeof categories;

interface PenaltiesCardProps {
  competitionId: string;
}

export function PenaltiesCard({ competitionId }: PenaltiesCardProps) {
  const { data: penalties, isLoading: penaltiesLoading } = usePenaltyRules(competitionId);
  const { data: infractions, isLoading: infractionsLoading } = useInfractions(competitionId);

  const isLoading = penaltiesLoading || infractionsLoading;
  const generalPenalties = infractions?.filter(i => i.category === "penalty") || [];
  const disqualifications = infractions?.filter(i => i.category === "disqualification") || [];

  const [activeCategory, setActiveCategory] = useState<Category>("time");

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const hasPenalties = (penalties && penalties.length > 0) || generalPenalties.length > 0 || disqualifications.length > 0;
  if (!hasPenalties) return null;

  const ActiveIcon = categories[activeCategory].icon;

  // Determine available categories
  const availableCategories = (Object.keys(categories) as Category[]).filter((key) => {
    if (key === "time") return penalties && penalties.length > 0;
    if (key === "general") return generalPenalties.length > 0;
    if (key === "dq") return disqualifications.length > 0;
    return false;
  });
  const swipeNav = useCallback((dir: 1 | -1) => {
    setActiveCategory(prev => {
      const i = availableCategories.indexOf(prev);
      const next = i + dir;
      return next >= 0 && next < availableCategories.length ? availableCategories[next] : prev;
    });
  }, [availableCategories]);
  const swipeHandlers = useSwipeGesture({ onSwipeLeft: () => swipeNav(1), onSwipeRight: () => swipeNav(-1) });

  return (
    <div className="space-y-3">
      {/* Category pill bar */}
      <div className="flex overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        <div className="flex gap-2 min-w-max">
          {availableCategories.map((key) => {
            const cat = categories[key];
            const Icon = cat.icon;
            const isActive = activeCategory === key;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 min-h-[44px] rounded-full text-sm font-medium border transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active category card */}
      <Card className="rounded-xl border-border/50 bg-card/80" {...swipeHandlers}>
        <CardContent className="p-3 sm:p-5 space-y-4">
          <Badge className="rounded-full gap-1.5 px-3 py-1 text-xs">
            <ActiveIcon className="h-3.5 w-3.5" />
            {categories[activeCategory].label}
          </Badge>

          {/* Time Penalties */}
          {activeCategory === "time" && penalties && penalties.length > 0 && (
            <div className="space-y-3">
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
              <div className="flex items-start gap-2 p-3 rounded bg-secondary/10 border border-secondary/20">
                <AlertTriangle className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  A grace period of {penalties[0].grace_period_seconds} seconds applies before penalties are calculated.
                </p>
              </div>
            </div>
          )}

          {/* General Penalties */}
          {activeCategory === "general" && generalPenalties.length > 0 && (
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
          )}

          {/* Disqualifications */}
          {activeCategory === "dq" && disqualifications.length > 0 && (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
