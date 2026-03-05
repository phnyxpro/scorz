import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ListOrdered, Shuffle, GripVertical, Link } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  subEventId: string;
}

function useApprovedContestants(subEventId: string | undefined) {
  return useQuery({
    queryKey: ["approved-contestants-order", subEventId],
    enabled: !!subEventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contestant_registrations")
        .select("id, full_name, sort_order, status")
        .eq("sub_event_id", subEventId!)
        .eq("status", "approved")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function PerformanceOrder({ subEventId }: Props) {
  const { data: contestants, isLoading } = useApprovedContestants(subEventId);
  const [showConfirm, setShowConfirm] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const qc = useQueryClient();

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    dragItem.current = idx;
    setDragIdx(idx);
  };

  const handleDragEnter = (idx: number) => {
    dragOverItem.current = idx;
    setOverIdx(idx);
  };

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null || !contestants) {
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

    // Persist new sort_order values
    const updates = reordered.map((c, i) =>
      supabase.from("contestant_registrations").update({ sort_order: i + 1 }).eq("id", c.id)
    );
    await Promise.all(updates);
    qc.invalidateQueries({ queryKey: ["approved-contestants-order", subEventId] });
  };

  const randomizeDraw = async () => {
    if (!contestants || contestants.length === 0) return;
    const shuffled = [...contestants].sort(() => Math.random() - 0.5);
    const updates = shuffled.map((c, i) =>
      supabase.from("contestant_registrations").update({ sort_order: i + 1 }).eq("id", c.id)
    );
    await Promise.all(updates);
    qc.invalidateQueries({ queryKey: ["approved-contestants-order", subEventId] });
    setShowConfirm(false);
    toast({ title: "Draw randomized!", description: `${shuffled.length} contestants shuffled.` });
  };

  const assignToSlots = async () => {
    if (!contestants || contestants.length === 0) return;
    setAssigning(true);
    try {
      const { data: slots, error } = await supabase
        .from("performance_slots")
        .select("id, slot_index, is_booked")
        .eq("sub_event_id", subEventId)
        .eq("is_booked", false)
        .order("slot_index", { ascending: true });
      if (error) throw error;

      const unassigned = contestants.filter(c => c.sort_order > 0);
      const toAssign = Math.min(unassigned.length, slots?.length || 0);
      if (toAssign === 0) {
        toast({ title: "No available slots", description: "Generate slots first or clear existing bookings.", variant: "destructive" });
        return;
      }

      const updates = [];
      for (let i = 0; i < toAssign; i++) {
        updates.push(
          supabase.from("performance_slots").update({
            contestant_registration_id: unassigned[i].id,
            is_booked: true,
          }).eq("id", slots![i].id)
        );
      }
      await Promise.all(updates);
      qc.invalidateQueries({ queryKey: ["performance-slots", subEventId] });
      qc.invalidateQueries({ queryKey: ["approved-contestants-order", subEventId] });
      toast({ title: `${toAssign} contestants assigned to slots` });
    } finally {
      setAssigning(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground animate-pulse">Loading contestants…</p>;
  if (!contestants || contestants.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ListOrdered className="h-4 w-4 text-primary" /> Order of Performance
          </CardTitle>
          <CardDescription>No approved contestants for this sub-event yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-primary" /> Order of Performance
              </CardTitle>
              <CardDescription>{contestants.length} approved contestants — drag to reorder</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowConfirm(true)}>
                <Shuffle className="h-3.5 w-3.5 mr-1" /> Randomize Draw
              </Button>
              <Button size="sm" onClick={assignToSlots} disabled={assigning}>
                <Link className="h-3.5 w-3.5 mr-1" /> Assign to Slots
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {contestants.map((c, idx) => (
              <div
                key={c.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md border border-transparent transition-all cursor-grab active:cursor-grabbing select-none",
                  dragIdx === idx && "opacity-40 border-dashed border-primary/50",
                  overIdx === idx && dragIdx !== idx && "border-primary/40 bg-primary/5",
                  dragIdx === null && "hover:bg-muted/30"
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-mono text-xs text-muted-foreground w-6 text-center">{idx + 1}</span>
                <span className="text-sm font-medium text-foreground">{c.full_name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Randomize Performance Order?</DialogTitle>
            <DialogDescription>
              This will shuffle all {contestants.length} approved contestants into a random order, overwriting the current sequence.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button onClick={randomizeDraw}>
              <Shuffle className="h-3.5 w-3.5 mr-1" /> Randomize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
