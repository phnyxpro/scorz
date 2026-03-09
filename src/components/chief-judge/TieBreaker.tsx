import { useState, useMemo, forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertTriangle, CheckCircle, Scale, GripVertical, Lock } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { JudgeScore } from "@/hooks/useJudgeScores";
import type { ChiefJudgeCertification } from "@/hooks/useChiefJudge";

interface TieBreakerProps {
  ties: { regId: string; avg: number; scores: JudgeScore[] }[][];
  contestantName: (regId: string) => string;
  isCertified: boolean;
  certification: ChiefJudgeCertification | null | undefined;
  onSaveTieBreakOrder: (tieBreakOrder: { regId: string; rank: number }[], notes: string) => Promise<void>;
  judgeNames?: Record<string, string>;
}

const SortableContestantItem = forwardRef<HTMLDivElement, {
  entry: { regId: string; avg: number; scores: JudgeScore[] };
  contestantName: (regId: string) => string;
  rank: number;
  isCertified: boolean;
  judgeNames?: Record<string, string>;
}>(function SortableContestantItem({ entry, contestantName, rank, isCertified, judgeNames }, _ref) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.regId,
    disabled: isCertified,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  const certifiedScores = entry.scores.filter((s) => s.is_certified);

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={entry.regId} className="border border-border/50 rounded-md mb-2 overflow-hidden">
        <div className="flex items-center">
          {!isCertified && (
            <div
              {...attributes}
              {...listeners}
              className="px-2 py-3 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
            {rank}
          </div>
          <AccordionTrigger className="flex-1 px-3 py-2 hover:no-underline">
            <div className="flex items-center gap-2 text-left">
              <span className="text-sm font-medium text-foreground">{contestantName(entry.regId)}</span>
              <Badge variant="outline" className="text-[10px] font-mono">{entry.avg.toFixed(2)} pts</Badge>
            </div>
          </AccordionTrigger>
        </div>
        <AccordionContent className="px-4 pb-3">
          <div className="space-y-1">
            <div className="grid grid-cols-4 gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/30 pb-1">
              <span>Judge</span>
              <span className="text-right">Raw</span>
              <span className="text-right">Penalty</span>
              <span className="text-right">Final</span>
            </div>
            {certifiedScores.map((s) => (
              <div key={s.id} className="grid grid-cols-4 gap-2 text-xs">
                <span className="text-foreground truncate">{judgeNames?.[s.judge_id] || s.judge_id.slice(0, 8)}</span>
                <span className="text-right font-mono text-muted-foreground">{Number(s.raw_total).toFixed(2)}</span>
                <span className="text-right font-mono text-destructive">{Number(s.time_penalty) > 0 ? `-${Number(s.time_penalty).toFixed(1)}` : "—"}</span>
                <span className="text-right font-mono font-bold text-foreground">{Number(s.final_score).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
});

export function TieBreaker({ ties, contestantName, isCertified, certification, onSaveTieBreakOrder, judgeNames }: TieBreakerProps) {
  // Parse saved tie break order
  const savedOrder = useMemo(() => {
    const raw = (certification?.tie_break_order ?? []) as { regId: string; rank: number }[];
    return Array.isArray(raw) ? raw : [];
  }, [certification?.tie_break_order]);

  const [notes, setNotes] = useState(certification?.tie_break_notes || "");
  const [saving, setSaving] = useState(false);

  // Maintain ordered lists per tie group
  const [groupOrders, setGroupOrders] = useState<Record<number, string[]>>(() => {
    const orders: Record<number, string[]> = {};
    ties.forEach((group, gi) => {
      // Check if saved order has entries for this group
      const groupRegIds = group.map((e) => e.regId);
      const savedForGroup = savedOrder
        .filter((s) => groupRegIds.includes(s.regId))
        .sort((a, b) => a.rank - b.rank)
        .map((s) => s.regId);

      if (savedForGroup.length === groupRegIds.length) {
        orders[gi] = savedForGroup;
      } else {
        orders[gi] = groupRegIds;
      }
    });
    return orders;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (groupIndex: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setGroupOrders((prev) => {
      const order = prev[groupIndex] || [];
      const oldIdx = order.indexOf(active.id as string);
      const newIdx = order.indexOf(over.id as string);
      return { ...prev, [groupIndex]: arrayMove(order, oldIdx, newIdx) };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    // Build flat tie_break_order array from all groups
    const allOrders: { regId: string; rank: number }[] = [];
    ties.forEach((_, gi) => {
      const order = groupOrders[gi] || [];
      order.forEach((regId, idx) => {
        allOrders.push({ regId, rank: idx + 1 });
      });
    });
    await onSaveTieBreakOrder(allOrders, notes);
    setSaving(false);
  };

  const isLocked = savedOrder.length > 0 && isCertified;

  if (ties.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="py-8 text-center">
          <CheckCircle className="h-8 w-8 text-secondary mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No ties detected. All scores are unique.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Tie Breaking</CardTitle>
        </div>
        <CardDescription>
          {ties.length} tie{ties.length > 1 ? "s" : ""} detected. Drag contestants to set final rank order.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ties.map((group, gi) => {
          const order = groupOrders[gi] || group.map((e) => e.regId);
          const entryMap = new Map(group.map((e) => [e.regId, e]));

          return (
            <div key={gi} className="border border-border/50 rounded-md p-3 bg-muted/20">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Tie at {group[0].avg.toFixed(2)} points
                </span>
                <Badge variant="outline" className="text-[10px]">{group.length} contestants</Badge>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(gi)}>
                <SortableContext items={order} strategy={verticalListSortingStrategy}>
                  <Accordion type="multiple" className="space-y-0">
                    {order.map((regId, idx) => {
                      const entry = entryMap.get(regId);
                      if (!entry) return null;
                      return (
                        <SortableContestantItem
                          key={regId}
                          entry={entry}
                          contestantName={contestantName}
                          rank={idx + 1}
                          isCertified={isCertified}
                          judgeNames={judgeNames}
                        />
                      );
                    })}
                  </Accordion>
                </SortableContext>
              </DndContext>
            </div>
          );
        })}

        {/* Save controls */}
        {!isCertified && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-muted-foreground">Tie-Break Notes (optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Justification for tie resolution…"
                rows={2}
              />
            </div>
            <Button onClick={handleSave} disabled={saving} size="sm" className="w-full gap-2">
              <Lock className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Lock Tie-Break Decision"}
            </Button>
          </div>
        )}

        {isLocked && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-secondary" />
              Tie-break order locked and certified.
            </p>
            {certification?.tie_break_notes && (
              <p className="text-xs text-muted-foreground mt-1 italic">{certification.tie_break_notes}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
