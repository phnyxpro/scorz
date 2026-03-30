import { useState, useCallback } from "react";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { usePenaltyRules, useCreatePenaltyRule, useDeletePenaltyRule, useInfractions, useCreateInfraction, useDeleteInfraction } from "@/hooks/useCompetitions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Timer, ShieldAlert, Ban, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const categories = {
  time: { label: "Time Penalties", icon: ShieldAlert, description: "Define time limits and penalty tiers for contestants who exceed their allotted performance time." },
  general: { label: "General Penalties", icon: AlertTriangle, description: "Point deductions for rule violations unrelated to time (e.g. using props, unauthorized assistance)." },
  dq: { label: "DQ Rules", icon: Ban, description: "Offences that result in immediate disqualification or forfeiture." },
} as const;

type Category = keyof typeof categories;

export function PenaltyConfig({ competitionId }: { competitionId: string }) {
  const { data: rules } = usePenaltyRules(competitionId);
  const create = useCreatePenaltyRule();
  const remove = useDeletePenaltyRule();

  const { data: infractions } = useInfractions(competitionId);
  const createInfraction = useCreateInfraction();
  const deleteInfraction = useDeleteInfraction();

  const [activeCategory, setActiveCategory] = useState<Category>("time");

  // Time penalty form
  const [fromSeconds, setFromSeconds] = useState("256");
  const [toSeconds, setToSeconds] = useState("265");
  const [points, setPoints] = useState("4");
  const [timeLimit, setTimeLimit] = useState("240");
  const [gracePeriod, setGracePeriod] = useState("15");
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);

  // General penalty form
  const [penTitle, setPenTitle] = useState("");
  const [penDesc, setPenDesc] = useState("");
  const [penPoints, setPenPoints] = useState("20");
  const [penDialogOpen, setPenDialogOpen] = useState(false);

  // DQ form
  const [dqTitle, setDqTitle] = useState("");
  const [dqDesc, setDqDesc] = useState("");
  const [dqDialogOpen, setDqDialogOpen] = useState(false);

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
      { onSuccess: () => { setFromSeconds(""); setToSeconds(""); setPoints(""); setTimeDialogOpen(false); } }
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
      { onSuccess: () => { setPenTitle(""); setPenDesc(""); setPenPoints("20"); setPenDialogOpen(false); } }
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
      { onSuccess: () => { setDqTitle(""); setDqDesc(""); setDqDialogOpen(false); } }
    );
  };

  const ActiveIcon = categories[activeCategory].icon;

  const keys = Object.keys(categories) as Category[];
  const swipeNav = useCallback((dir: 1 | -1) => {
    setActiveCategory(prev => {
      const i = keys.indexOf(prev);
      const next = i + dir;
      return next >= 0 && next < keys.length ? keys[next] : prev;
    });
  }, [keys]);
  const swipeHandlers = useSwipeGesture({ onSwipeLeft: () => swipeNav(1), onSwipeRight: () => swipeNav(-1) });

  return (
    <div className="space-y-4">
      {/* Category pill bar */}
      <div className="flex overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        <div className="flex gap-2 min-w-max">
          {(Object.keys(categories) as Category[]).map((key) => {
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
          {/* Time Penalties */}
          {activeCategory === "time" && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted-foreground pt-1">{categories[activeCategory].description}</p>
                <Dialog open={timeDialogOpen} onOpenChange={setTimeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="shrink-0 ml-3">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Time Penalty
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Time Penalty Tier</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Time Limit (seconds)</label>
                          <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Grace Period (seconds)</label>
                          <Input type="number" value={gracePeriod} onChange={(e) => setGracePeriod(e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">From (sec)</label>
                          <Input type="number" value={fromSeconds} onChange={(e) => setFromSeconds(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">To (sec, empty = ∞)</label>
                          <Input type="number" value={toSeconds} onChange={(e) => setToSeconds(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Penalty pts</label>
                          <Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
                        </div>
                      </div>
                      <Button onClick={handleAdd} disabled={create.isPending} className="w-full">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Penalty Tier
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-2">
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
                {(!rules || rules.length === 0) && <p className="text-xs text-muted-foreground italic">No time penalty tiers defined yet.</p>}
              </div>
            </div>
          )}

          {/* General Penalties */}
          {activeCategory === "general" && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted-foreground pt-1">{categories[activeCategory].description}</p>
                <Dialog open={penDialogOpen} onOpenChange={setPenDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="shrink-0 ml-3">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Penalty
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add General Penalty</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                      <Input placeholder="Title (e.g. Using Props)" value={penTitle} onChange={(e) => setPenTitle(e.target.value)} />
                      <Textarea placeholder="Description (optional)" value={penDesc} onChange={(e) => setPenDesc(e.target.value)} className="min-h-[80px]" />
                      <div>
                        <label className="text-xs text-muted-foreground">Points deducted</label>
                        <Input type="number" value={penPoints} onChange={(e) => setPenPoints(e.target.value)} className="w-32" />
                      </div>
                      <Button onClick={handleAddPenalty} disabled={createInfraction.isPending} className="w-full">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Penalty
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

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
            </div>
          )}

          {/* Disqualification Rules */}
          {activeCategory === "dq" && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted-foreground pt-1">{categories[activeCategory].description}</p>
                <Dialog open={dqDialogOpen} onOpenChange={setDqDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="shrink-0 ml-3">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add DQ Rule
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Disqualification Rule</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                      <Input placeholder="Title (e.g. Plagiarism or AI Use)" value={dqTitle} onChange={(e) => setDqTitle(e.target.value)} />
                      <Textarea placeholder="Description (optional)" value={dqDesc} onChange={(e) => setDqDesc(e.target.value)} className="min-h-[80px]" />
                      <Button onClick={handleAddDQ} disabled={createInfraction.isPending} className="w-full">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Disqualification Rule
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
