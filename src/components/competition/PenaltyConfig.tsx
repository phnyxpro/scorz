import { useState } from "react";
import { usePenaltyRules, useCreatePenaltyRule, useDeletePenaltyRule, useInfractions, useCreateInfraction, useDeleteInfraction } from "@/hooks/useCompetitions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Timer, ShieldAlert, Ban, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PenaltyConfig({ competitionId }: { competitionId: string }) {
  const { data: rules } = usePenaltyRules(competitionId);
  const create = useCreatePenaltyRule();
  const remove = useDeletePenaltyRule();

  const { data: infractions } = useInfractions(competitionId);
  const createInfraction = useCreateInfraction();
  const deleteInfraction = useDeleteInfraction();

  const [fromSeconds, setFromSeconds] = useState("256");
  const [toSeconds, setToSeconds] = useState("265");
  const [points, setPoints] = useState("4");
  const [timeLimit, setTimeLimit] = useState("240");
  const [gracePeriod, setGracePeriod] = useState("15");

  // General penalty form
  const [penTitle, setPenTitle] = useState("");
  const [penDesc, setPenDesc] = useState("");
  const [penPoints, setPenPoints] = useState("20");

  // Disqualification form
  const [dqTitle, setDqTitle] = useState("");
  const [dqDesc, setDqDesc] = useState("");

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

  const penalties = infractions?.filter(i => i.category === "penalty") || [];
  const disqualifications = infractions?.filter(i => i.category === "disqualification") || [];

  const handleAddPenalty = () => {
    if (!penTitle.trim()) return;
    createInfraction.mutate(
      {
        competition_id: competitionId,
        category: "penalty",
        title: penTitle.trim(),
        description: penDesc.trim() || null,
        penalty_points: parseFloat(penPoints) || 0,
        sort_order: penalties.length,
      },
      { onSuccess: () => { setPenTitle(""); setPenDesc(""); setPenPoints("20"); } }
    );
  };

  const handleAddDQ = () => {
    if (!dqTitle.trim()) return;
    createInfraction.mutate(
      {
        competition_id: competitionId,
        category: "disqualification",
        title: dqTitle.trim(),
        description: dqDesc.trim() || null,
        penalty_points: 0,
        sort_order: disqualifications.length,
      },
      { onSuccess: () => { setDqTitle(""); setDqDesc(""); } }
    );
  };

  return (
    <div className="space-y-6">
      {/* Time Penalties */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-secondary" />
            <CardTitle className="text-base">Time Penalties</CardTitle>
          </div>
          <CardDescription>Define time limits and penalty tiers for contestants who exceed their allotted performance time.</CardDescription>
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

      {/* General Penalties */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-secondary" />
            <CardTitle className="text-base">General Penalties</CardTitle>
          </div>
          <CardDescription>Point deductions for rule violations unrelated to time (e.g. using props, unauthorized assistance).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {penalties.map((p) => (
              <div key={p.id} className="flex items-start justify-between bg-muted/30 rounded-md px-3 py-2.5">
                <div className="space-y-0.5 flex-1 mr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{p.title}</span>
                    <Badge variant="destructive" className="font-mono text-[10px]">−{p.penalty_points}pts</Badge>
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteInfraction.mutate({ id: p.id, competition_id: competitionId })}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {penalties.length === 0 && <p className="text-xs text-muted-foreground italic">No general penalties defined yet.</p>}
          </div>

          <div className="space-y-2 border-t border-border/50 pt-3">
            <h3 className="text-sm font-medium text-foreground">Add General Penalty</h3>
            <Input placeholder="Title (e.g. Using Props)" value={penTitle} onChange={(e) => setPenTitle(e.target.value)} className="h-8 text-sm" />
            <Textarea placeholder="Description (optional)" value={penDesc} onChange={(e) => setPenDesc(e.target.value)} className="text-sm min-h-[60px]" />
            <div>
              <label className="text-xs text-muted-foreground">Points deducted</label>
              <Input type="number" value={penPoints} onChange={(e) => setPenPoints(e.target.value)} className="h-8 text-sm w-32" />
            </div>
            <Button size="sm" variant="outline" onClick={handleAddPenalty} disabled={createInfraction.isPending} className="w-full">
              <Plus className="h-3 w-3 mr-1" /> Add Penalty
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Disqualifications */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            <CardTitle className="text-base">Disqualification Rules</CardTitle>
          </div>
          <CardDescription>Offences that result in immediate disqualification or forfeiture.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {disqualifications.map((d) => (
              <div key={d.id} className="flex items-start justify-between bg-muted/30 rounded-md px-3 py-2.5">
                <div className="space-y-0.5 flex-1 mr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{d.title}</span>
                    <Badge variant="destructive" className="text-[10px]">DQ</Badge>
                  </div>
                  {d.description && <p className="text-xs text-muted-foreground leading-relaxed">{d.description}</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteInfraction.mutate({ id: d.id, competition_id: competitionId })}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {disqualifications.length === 0 && <p className="text-xs text-muted-foreground italic">No disqualification rules defined yet.</p>}
          </div>

          <div className="space-y-2 border-t border-border/50 pt-3">
            <h3 className="text-sm font-medium text-foreground">Add Disqualification Rule</h3>
            <Input placeholder="Title (e.g. Plagiarism or AI Use)" value={dqTitle} onChange={(e) => setDqTitle(e.target.value)} className="h-8 text-sm" />
            <Textarea placeholder="Description (optional)" value={dqDesc} onChange={(e) => setDqDesc(e.target.value)} className="text-sm min-h-[60px]" />
            <Button size="sm" variant="outline" onClick={handleAddDQ} disabled={createInfraction.isPending} className="w-full">
              <Plus className="h-3 w-3 mr-1" /> Add Disqualification Rule
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
