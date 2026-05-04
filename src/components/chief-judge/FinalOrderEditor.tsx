import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Lock, Save, RotateCcw, ListOrdered } from "lucide-react";
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

interface Entry {
  regId: string;
  avg: number;
  calculatedRank: number;
}

interface Props {
  entries: Entry[];
  contestantName: (regId: string) => string;
  isLocked: boolean;
  savedOrder: { regId: string; rank: number }[];
  onSave: (order: { regId: string; rank: number; calculatedRank: number }[]) => Promise<void> | void;
  saving?: boolean;
}

function Row({
  regId,
  name,
  finalRank,
  calculatedRank,
  avg,
  disabled,
}: {
  regId: string;
  name: string;
  finalRank: number;
  calculatedRank: number;
  avg: number;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: regId,
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };
  const moved = finalRank !== calculatedRank;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-2 py-2 border border-border/50 rounded-md bg-card/60"
    >
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
        {finalRank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
      </div>
      <Badge variant="outline" className="text-[10px] font-mono">{avg.toFixed(2)}</Badge>
      <Badge
        variant="outline"
        className={`text-[10px] font-mono ${moved ? "border-amber-500/50 text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
      >
        Calc #{calculatedRank}
      </Badge>
    </div>
  );
}

export function FinalOrderEditor({ entries, contestantName, isLocked, savedOrder, onSave, saving }: Props) {
  // Build initial order: respect savedOrder rank, fall back to calculatedRank
  const initialOrder = useMemo(() => {
    const savedMap = new Map(savedOrder.map((s) => [s.regId, s.rank]));
    const sorted = [...entries].sort((a, b) => {
      const ra = savedMap.get(a.regId) ?? a.calculatedRank;
      const rb = savedMap.get(b.regId) ?? b.calculatedRank;
      return ra - rb;
    });
    return sorted.map((e) => e.regId);
  }, [entries, savedOrder]);

  const [order, setOrder] = useState<string[]>(initialOrder);

  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  const entryMap = useMemo(() => new Map(entries.map((e) => [e.regId, e])), [entries]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = order.indexOf(active.id as string);
    const newIdx = order.indexOf(over.id as string);
    setOrder(arrayMove(order, oldIdx, newIdx));
  };

  const isDirty = useMemo(() => {
    if (order.length !== initialOrder.length) return true;
    return order.some((id, i) => id !== initialOrder[i]);
  }, [order, initialOrder]);

  const handleReset = () => {
    setOrder(entries.sort((a, b) => a.calculatedRank - b.calculatedRank).map((e) => e.regId));
  };

  const handleSave = async () => {
    const payload = order.map((regId, idx) => ({
      regId,
      rank: idx + 1,
      calculatedRank: entryMap.get(regId)?.calculatedRank ?? idx + 1,
    }));
    await onSave(payload);
  };

  if (entries.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          No certified scores yet — final placement order becomes available once judges have certified.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Final Placement Order</CardTitle>
          </div>
          {isLocked && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Lock className="h-3 w-3" /> Locked
            </Badge>
          )}
        </div>
        <CardDescription>
          Drag to override the displayed placement. The calculated rank and each judge&apos;s scorecard are preserved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {order.map((regId, idx) => {
                const e = entryMap.get(regId);
                if (!e) return null;
                return (
                  <Row
                    key={regId}
                    regId={regId}
                    name={contestantName(regId)}
                    finalRank={idx + 1}
                    calculatedRank={e.calculatedRank}
                    avg={e.avg}
                    disabled={isLocked}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {!isLocked && (
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={handleReset} disabled={saving}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset to calculated
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !isDirty}>
              <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Saving…" : "Save Final Order"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
