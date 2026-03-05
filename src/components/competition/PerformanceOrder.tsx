import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ListOrdered, Shuffle, ArrowUp, ArrowDown, Link } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

  const moveContestant = async (index: number, direction: -1 | 1) => {
    if (!contestants) return;
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= contestants.length) return;

    const a = contestants[index];
    const b = contestants[swapIndex];

    const updates = [
      supabase.from("contestant_registrations").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("contestant_registrations").update({ sort_order: a.sort_order }).eq("id", b.id),
    ];
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
      // Get available slots ordered by slot_index
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
              <CardDescription>{contestants.length} approved contestants</CardDescription>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[40px]">#</TableHead>
                  <TableHead className="text-xs">Contestant</TableHead>
                  <TableHead className="text-xs w-[80px]">Reorder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contestants.map((c, idx) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="text-sm font-medium">{c.full_name}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={idx === 0}
                          onClick={() => moveContestant(idx, -1)}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={idx === contestants.length - 1}
                          onClick={() => moveContestant(idx, 1)}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
