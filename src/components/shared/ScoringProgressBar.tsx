import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock } from "lucide-react";

interface ScoringProgressBarProps {
  allScores: { is_certified: boolean; judge_id: string; contestant_registration_id: string }[] | undefined;
  /** Total number of expected scorecards (judges × contestants). If omitted, uses allScores.length as denominator. */
  expectedTotal?: number;
}

export function ScoringProgressBar({ allScores, expectedTotal }: ScoringProgressBarProps) {
  const { certified, total, pct } = useMemo(() => {
    if (!allScores || allScores.length === 0) return { certified: 0, total: 0, pct: 0 };
    const c = allScores.filter((s) => s.is_certified).length;
    const t = expectedTotal ?? allScores.length;
    return { certified: c, total: t, pct: t > 0 ? Math.round((c / t) * 100) : 0 };
  }, [allScores, expectedTotal]);

  if (total === 0) return null;

  const isComplete = pct === 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1">
          {isComplete ? (
            <CheckCircle2 className="h-3 w-3 text-primary" />
          ) : (
            <Clock className="h-3 w-3" />
          )}
          Scoring Progress
        </span>
        <span>
          {certified}/{total} certified · <span className="text-foreground font-semibold">{pct}%</span>
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}
