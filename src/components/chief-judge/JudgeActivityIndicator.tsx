import { useMemo } from "react";
import { useSubEventAssignments } from "@/hooks/useSubEventAssignments";
import { useStaffDisplayNames } from "@/hooks/useStaffDisplayNames";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { PenLine, CheckCircle2, Clock } from "lucide-react";
import type { JudgeScore } from "@/hooks/useJudgeScores";

interface JudgeActivityIndicatorProps {
  subEventId: string;
  allScores: JudgeScore[] | undefined;
  contestantCount: number;
}

export function JudgeActivityIndicator({ subEventId, allScores, contestantCount }: JudgeActivityIndicatorProps) {
  const { data: assignments } = useSubEventAssignments(subEventId);

  // Get judge assignments only (exclude chief)
  const judgeAssignments = useMemo(
    () => (assignments || []).filter((a) => a.role === "judge"),
    [assignments]
  );

  const judgeUserIds = useMemo(() => judgeAssignments.map((a) => a.user_id), [judgeAssignments]);

  // Resolve judge display names via shared hook (staff invitation name → profile name → friendly email)
  const nameMap = useStaffDisplayNames(judgeUserIds);

  // Compute per-judge activity
  const judgeActivity = useMemo(() => {
    if (!allScores) return [];

    const now = Date.now();
    const ACTIVE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    return judgeUserIds.map((judgeId) => {
      const scores = allScores.filter((s) => s.judge_id === judgeId);
      const certifiedCount = scores.filter((s) => s.is_certified).length;
      const draftCount = scores.filter((s) => !s.is_certified).length;
      const totalScored = scores.length;

      // Check if judge has updated a score recently
      const lastUpdate = scores.reduce((latest, s) => {
        const t = new Date(s.updated_at).getTime();
        return t > latest ? t : latest;
      }, 0);

      const isActive = lastUpdate > 0 && now - lastUpdate < ACTIVE_THRESHOLD;

      return {
        judgeId,
        name: nameMap.get(judgeId) || "Judge",
        initials: (nameMap.get(judgeId) || "J").slice(0, 2).toUpperCase(),
        totalScored,
        certifiedCount,
        draftCount,
        isActive,
        isComplete: certifiedCount === contestantCount && contestantCount > 0,
        lastUpdate,
      };
    });
  }, [judgeUserIds, allScores, nameMap, contestantCount]);

  if (judgeActivity.length === 0) return null;

  const activeCount = judgeActivity.filter((j) => j.isActive).length;
  const completeCount = judgeActivity.filter((j) => j.isComplete).length;

  return (
    <div className="border border-border/50 rounded-lg bg-card/80 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          Judge Activity
        </p>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Badge variant="outline" className="text-[9px] gap-1 border-green-500/40 text-green-600">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              {activeCount} scoring
            </Badge>
          )}
          <Badge variant="outline" className="text-[9px] gap-1">
            {completeCount}/{judgeActivity.length} done
          </Badge>
        </div>
      </div>

      <TooltipProvider delayDuration={200}>
        <div className="flex flex-wrap gap-2">
          {judgeActivity.map((judge) => (
            <Tooltip key={judge.judgeId}>
              <TooltipTrigger asChild>
                <div
                  className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                    judge.isActive
                      ? "border-green-500/50 bg-green-500/10"
                      : judge.isComplete
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/50 bg-muted/20"
                  }`}
                >
                  <div className="relative">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[9px] bg-muted">
                        {judge.initials}
                      </AvatarFallback>
                    </Avatar>
                    {judge.isActive && (
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card animate-pulse" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-foreground truncate max-w-[180px]">
                      {judge.name}
                    </span>
                    <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                      {judge.isComplete ? (
                        <>
                          <CheckCircle2 className="h-2.5 w-2.5 text-primary" /> All certified
                        </>
                      ) : judge.isActive ? (
                        <>
                          <PenLine className="h-2.5 w-2.5 text-green-600" /> Scoring now
                        </>
                      ) : judge.totalScored > 0 ? (
                        <>
                          <Clock className="h-2.5 w-2.5" /> {judge.certifiedCount}/{contestantCount} certified
                        </>
                      ) : (
                        <>
                          <Clock className="h-2.5 w-2.5" /> Not started
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-medium">{judge.name}</p>
                <p className="text-muted-foreground">
                  {judge.totalScored} scored · {judge.certifiedCount} certified · {judge.draftCount} drafts
                </p>
                {judge.lastUpdate > 0 && (
                  <p className="text-muted-foreground">
                    Last update: {new Date(judge.lastUpdate).toLocaleTimeString()}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
