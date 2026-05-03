import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ListOrdered, Shuffle, GripVertical, Link } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  subEventId: string;
}

function useSubEventSettings(subEventId: string | undefined) {
  return useQuery({
    queryKey: ["sub-event-settings", subEventId],
    enabled: !!subEventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_events")
        .select("id, show_standbys, lineup_locked, lineup_locked_at")
        .eq("id", subEventId!)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; show_standbys: boolean; lineup_locked: boolean; lineup_locked_at: string | null } | null;
    },
  });
}

function useApprovedContestants(subEventId: string | undefined) {
  return useQuery({
    queryKey: ["approved-contestants-order", subEventId],
    enabled: !!subEventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contestant_registrations")
        .select("id, full_name, sort_order, status, special_entry_type")
        .eq("sub_event_id", subEventId!)
        .eq("status", "approved")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Array<{ id: string; full_name: string; sort_order: number; status: string; special_entry_type: string | null }>;
    },
  });
}

const isStandby = (t: string | null | undefined) => t === "standby_1" || t === "standby_2";
const standbyLabel = (t: string | null | undefined) =>
  t === "standby_1" ? "Standby 1" : t === "standby_2" ? "Standby 2" : null;

export function PerformanceOrder({ subEventId }: Props) {
  const { data: contestants, isLoading } = useApprovedContestants(subEventId);
  const { data: settings } = useSubEventSettings(subEventId);
  const showStandbys = !!settings?.show_standbys;
  const lineupLocked = !!settings?.lineup_locked;
  const [showConfirm, setShowConfirm] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const qc = useQueryClient();

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const visibleContestants = (contestants ?? []).filter(
    (c) => showStandbys || !isStandby(c.special_entry_type)
  );

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

    const reordered = [...visibleContestants];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    const withOrder = reordered.map((c, i) => ({ ...c, sort_order: i + 1 }));
    // Merge back with hidden standbys (kept at the tail)
    const hidden = (contestants ?? []).filter((c) => !visibleContestants.includes(c));
    const merged = [...withOrder, ...hidden.map((c, i) => ({ ...c, sort_order: withOrder.length + i + 1 }))];
    qc.setQueryData(["approved-contestants-order", subEventId], merged);

    try {
      await Promise.all(merged.map((c) =>
        supabase.from("contestant_registrations").update({ sort_order: c.sort_order }).eq("id", c.id)
      ));
    } catch {
      qc.invalidateQueries({ queryKey: ["approved-contestants-order", subEventId] });
    }
  };

  const randomizeDraw = async () => {
    if (!contestants || contestants.length === 0) return;
    // Only shuffle non-standby contestants; keep standbys at end in their original order
    const main = contestants.filter((c) => !isStandby(c.special_entry_type));
    const standbys = contestants.filter((c) => isStandby(c.special_entry_type))
      .sort((a, b) => (a.special_entry_type || "").localeCompare(b.special_entry_type || ""));
    const shuffled = [...main].sort(() => Math.random() - 0.5);
    const withOrder = [...shuffled, ...standbys].map((c, i) => ({ ...c, sort_order: i + 1 }));

    qc.setQueryData(["approved-contestants-order", subEventId], withOrder);
    setShowConfirm(false);
    toast({ title: "Draw randomised!", description: `${shuffled.length} contestants shuffled.` });

    try {
      await Promise.all(withOrder.map((c) =>
        supabase.from("contestant_registrations").update({ sort_order: c.sort_order }).eq("id", c.id)
      ));
    } catch {
      qc.invalidateQueries({ queryKey: ["approved-contestants-order", subEventId] });
    }
  };

  const toggleShowStandbys = async (checked: boolean) => {
    if (!subEventId) return;
    qc.setQueryData(["sub-event-settings", subEventId], { ...(settings || { id: subEventId }), show_standbys: checked });
    const { error } = await supabase.from("sub_events").update({ show_standbys: checked } as any).eq("id", subEventId);
    if (error) {
      toast({ title: "Could not update", description: error.message, variant: "destructive" });
      qc.invalidateQueries({ queryKey: ["sub-event-settings", subEventId] });
    } else {
      toast({ title: checked ? "Standbys visible" : "Standbys hidden" });
    }
  };

  const toggleLineupLock = async () => {
    if (!subEventId) return;
    const next = !lineupLocked;
    qc.setQueryData(["sub-event-settings", subEventId], { ...(settings || { id: subEventId }), lineup_locked: next, lineup_locked_at: next ? new Date().toISOString() : null });
    const { error } = await supabase.from("sub_events").update({
      lineup_locked: next,
      lineup_locked_at: next ? new Date().toISOString() : null,
    } as any).eq("id", subEventId);
    if (error) {
      toast({ title: "Could not update", description: error.message, variant: "destructive" });
      qc.invalidateQueries({ queryKey: ["sub-event-settings", subEventId] });
    } else {
      toast({ title: next ? "Lineup locked for tabulation" : "Lineup unlocked" });
    }
  };
    if (!visibleContestants || visibleContestants.length === 0) return;
    setAssigning(true);
    try {
      const { data: slots, error } = await supabase
        .from("performance_slots")
        .select("id, slot_index, is_booked")
        .eq("sub_event_id", subEventId)
        .eq("is_booked", false)
        .order("slot_index", { ascending: true });
      if (error) throw error;

      const unassigned = visibleContestants.filter((c) => c.sort_order > 0);
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

  const hasStandbys = contestants.some((c) => isStandby(c.special_entry_type));

  return (
    <>
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-primary" /> Order of Performance
              </CardTitle>
              <CardDescription>
                {visibleContestants.length} contestants{hasStandbys && !showStandbys ? ` (+${contestants.length - visibleContestants.length} standby hidden)` : ""} — drag to reorder
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              {hasStandbys && (
                <div className="flex items-center gap-2 px-2 py-1 rounded-md border border-border/50 bg-muted/20">
                  <Switch id="show-standbys" checked={showStandbys} onCheckedChange={toggleShowStandbys} />
                  <Label htmlFor="show-standbys" className="text-xs cursor-pointer">Show standbys</Label>
                </div>
              )}
              <Button size="sm" variant="outline" onClick={() => setShowConfirm(true)}>
                <Shuffle className="h-3.5 w-3.5 mr-1" /> Randomise Draw
              </Button>
              <Button size="sm" onClick={assignToSlots} disabled={assigning}>
                <Link className="h-3.5 w-3.5 mr-1" /> Assign to Slots
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {visibleContestants.map((c, idx) => {
              const sbLabel = standbyLabel(c.special_entry_type);
              return (
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
                    dragIdx === null && "hover:bg-muted/30",
                    sbLabel && "bg-amber-500/5"
                  )}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-mono text-xs text-muted-foreground w-6 text-center">{idx + 1}</span>
                  <span className="text-sm font-medium text-foreground flex-1">{c.full_name}</span>
                  {sbLabel && (
                    <Badge className="bg-amber-500/80 text-white text-[10px] px-1.5">{sbLabel}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Randomise Performance Order?</DialogTitle>
            <DialogDescription>
              This will shuffle all main contestants into a random order. Standbys remain at the end.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button onClick={randomizeDraw}>
              <Shuffle className="h-3.5 w-3.5 mr-1" /> Randomise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
