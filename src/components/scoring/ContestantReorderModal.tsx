import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GripVertical, Shuffle, ChevronUp, ChevronDown, ArrowDownToLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ContestantReorderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contestants: Array<{ id: string; full_name: string }>;
  subEventId: string;
  /** Set of contestant IDs that have recorded durations */
  timedContestantIds?: Set<string>;
}

export function ContestantReorderModal({ open, onOpenChange, contestants, subEventId, timedContestantIds }: ContestantReorderModalProps) {
  const qc = useQueryClient();
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [showRandomizeConfirm, setShowRandomizeConfirm] = useState(false);

  const persistOrder = async (ordered: Array<{ id: string }>) => {
    const updates = ordered.map((c, i) =>
      supabase.from("contestant_registrations").update({ sort_order: i + 1 }).eq("id", c.id)
    );
    await Promise.all(updates);
    qc.invalidateQueries({ queryKey: ["judging_overview"] });
    qc.invalidateQueries({ queryKey: ["approved-contestants-order"] });
  };

  const handleDragStart = (idx: number) => {
    dragItem.current = idx;
    setDragIdx(idx);
  };

  const handleDragEnter = (idx: number) => {
    dragOverItem.current = idx;
    setOverIdx(idx);
  };

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const from = dragItem.current;
    const to = dragOverItem.current;
    dragItem.current = null;
    dragOverItem.current = null;
    setDragIdx(null);
    setOverIdx(null);
    if (from === to) return;

    const reordered = [...contestants];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    await persistOrder(reordered);
  };

  const moveItem = async (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= contestants.length || fromIdx === toIdx) return;
    const reordered = [...contestants];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    await persistOrder(reordered);
  };

  const moveAfterLastTimed = async (idx: number) => {
    if (!timedContestantIds || timedContestantIds.size === 0) return;
    // Find the last index of a timed contestant
    let lastTimedIdx = -1;
    contestants.forEach((c, i) => {
      if (timedContestantIds.has(c.id)) lastTimedIdx = i;
    });
    if (lastTimedIdx < 0) return;
    const targetIdx = idx <= lastTimedIdx ? lastTimedIdx : lastTimedIdx + 1;
    if (targetIdx === idx) return;
    await moveItem(idx, targetIdx);
    toast({ title: "Moved after last timed contestant" });
  };

  const randomizeDraw = async () => {
    const shuffled = [...contestants].sort(() => Math.random() - 0.5);
    await persistOrder(shuffled);
    setShowRandomizeConfirm(false);
    toast({ title: "Draw randomized!", description: `${shuffled.length} contestants shuffled.` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Performance Order</DialogTitle>
          <DialogDescription>
            Drag or use arrows to reorder {contestants.length} contestants. Changes save automatically.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-1 pr-3">
            {contestants.map((c, idx) => (
              <div
                key={c.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md border border-transparent transition-all cursor-grab active:cursor-grabbing select-none",
                  dragIdx === idx && "opacity-40 border-dashed border-primary/50",
                  overIdx === idx && dragIdx !== idx && "border-primary/40 bg-primary/5",
                  dragIdx === null && "hover:bg-muted/30"
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-mono text-xs text-muted-foreground w-6 text-center">{idx + 1}</span>
                <span className="text-sm font-medium text-foreground flex-1">{c.full_name}</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  {timedContestantIds && timedContestantIds.size > 0 && !timedContestantIds.has(c.id) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveAfterLastTimed(idx)}>
                          <ArrowDownToLine className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left"><p className="text-xs">Move after last timed</p></TooltipContent>
                    </Tooltip>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => moveItem(idx, idx - 1)}>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === contestants.length - 1} onClick={() => moveItem(idx, idx + 1)}>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          {!showRandomizeConfirm ? (
            <Button variant="outline" size="sm" onClick={() => setShowRandomizeConfirm(true)}>
              <Shuffle className="h-3.5 w-3.5 mr-1" /> Randomize
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Shuffle all?</span>
              <Button variant="destructive" size="sm" onClick={randomizeDraw}>Yes</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowRandomizeConfirm(false)}>No</Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
