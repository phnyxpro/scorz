import { useState } from "react";
import { usePenaltyRules, useCreatePenaltyRule, useDeletePenaltyRule } from "@/hooks/useCompetitions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Timer, ShieldAlert } from "lucide-react";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PenaltyConfig({ competitionId }: { competitionId: string }) {
  const { data: rules } = usePenaltyRules(competitionId);
  const create = useCreatePenaltyRule();
  const remove = useDeletePenaltyRule();

  const [fromSeconds, setFromSeconds] = useState("256");
  const [toSeconds, setToSeconds] = useState("265");
  const [points, setPoints] = useState("4");
  const [timeLimit, setTimeLimit] = useState("240");
  const [gracePeriod, setGracePeriod] = useState("15");

  const handleAdd = () => {
    const from = parseInt(fromSeconds);
    const to = toSeconds ? parseInt(toSeconds) : null;
    const pts = parseFloat(points);
    if (isNaN(from) || isNaN(pts)) return;
    create.mutate(
      {
        competition_id: competitionId,
        from_seconds: from,
        to_seconds: to,
        penalty_points: pts,
        time_limit_seconds: parseInt(timeLimit) || 240,
        grace_period_seconds: parseInt(gracePeriod) || 15,
        sort_order: rules?.length || 0,
      },
      { onSuccess: () => { setFromSeconds(""); setToSeconds(""); setPoints(""); } }
    );
  };

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader>
        <CardTitle className="text-base">Penalty Configuration</CardTitle>
        <CardDescription>Define time limits and penalty tiers for going over time</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Time Limit (seconds)</label>
            <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} className="h-9" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Grace Period (seconds)</label>
            <Input type="number" value={gracePeriod} onChange={(e) => setGracePeriod(e.target.value)} className="h-9" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Penalty Tiers</h3>
          {rules?.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <Timer className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono text-foreground">
                  {formatTime(r.from_seconds)} {r.to_seconds ? `→ ${formatTime(r.to_seconds)}` : "+"}
                </span>
                <span className="text-destructive font-bold">−{r.penalty_points}pts</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate({ id: r.id, competition_id: competitionId })}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-border/50 pt-3">
          <h3 className="text-sm font-medium text-foreground">Add Penalty Tier</h3>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">From (sec)</label>
              <Input type="number" value={fromSeconds} onChange={(e) => setFromSeconds(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To (sec, empty = ∞)</label>
              <Input type="number" value={toSeconds} onChange={(e) => setToSeconds(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Penalty pts</label>
              <Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleAdd} disabled={create.isPending} className="w-full">
            <Plus className="h-3 w-3 mr-1" /> Add Penalty Tier
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
