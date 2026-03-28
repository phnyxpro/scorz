import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLevels, useSubEvents } from "@/hooks/useCompetitions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Trash2, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PerformanceOrder } from "./PerformanceOrder";

interface Props {
  competitionId: string;
}

interface SlotWithPerformer {
  id: string;
  slot_index: number;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  contestant_registration_id: string | null;
  performer_name?: string;
}

function usePerformanceSlots(subEventId: string | undefined) {
  return useQuery({
    queryKey: ["performance-slots", subEventId],
    enabled: !!subEventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_slots")
        .select("*, contestant_registrations(full_name)")
        .eq("sub_event_id", subEventId!)
        .order("slot_index", { ascending: true });
      if (error) throw error;
      return (data as any[]).map((s) => ({
        id: s.id,
        slot_index: s.slot_index,
        start_time: s.start_time,
        end_time: s.end_time,
        is_booked: s.is_booked,
        contestant_registration_id: s.contestant_registration_id,
        performer_name: s.contestant_registrations?.full_name || undefined,
      })) as SlotWithPerformer[];
    },
  });
}

const formatTime = (t: string) => {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

export function SlotsManager({ competitionId }: Props) {
  const { data: levels } = useLevels(competitionId);
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [selectedSubEventId, setSelectedSubEventId] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [slotCount, setSlotCount] = useState("10");
  const [slotDuration, setSlotDuration] = useState("5");
  const qc = useQueryClient();

  if (levels?.length && !selectedLevelId) setSelectedLevelId(levels[0].id);

  const { data: subEvents } = useSubEvents(selectedLevelId || undefined);
  const { data: slots, isLoading } = usePerformanceSlots(selectedSubEventId || undefined);
  const selectedSubEvent = subEvents?.find(se => se.id === selectedSubEventId);
  const useTimeSlots = selectedSubEvent ? (selectedSubEvent as any).use_time_slots !== false : true;

  const generateSlots = async () => {
    if (!selectedSubEventId) return;
    const count = parseInt(slotCount);
    const duration = parseInt(slotDuration);
    if (isNaN(count) || isNaN(duration) || count < 1) return;

    const [h, m] = startTime.split(":").map(Number);
    const slotsToInsert = [];
    for (let i = 0; i < count; i++) {
      const totalMinStart = h * 60 + m + i * duration;
      const totalMinEnd = totalMinStart + duration;
      slotsToInsert.push({
        sub_event_id: selectedSubEventId,
        slot_index: i,
        start_time: `${String(Math.floor(totalMinStart / 60)).padStart(2, "0")}:${String(totalMinStart % 60).padStart(2, "0")}:00`,
        end_time: `${String(Math.floor(totalMinEnd / 60)).padStart(2, "0")}:${String(totalMinEnd % 60).padStart(2, "0")}:00`,
      });
    }

    const { error } = await supabase.from("performance_slots").insert(slotsToInsert as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${count} slots generated` });
      qc.invalidateQueries({ queryKey: ["performance-slots", selectedSubEventId] });
    }
  };

  const deleteSlot = async (id: string) => {
    await supabase.from("performance_slots").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["performance-slots", selectedSubEventId] });
  };

  const clearAllSlots = async () => {
    if (!selectedSubEventId) return;
    await supabase.from("performance_slots").delete().eq("sub_event_id", selectedSubEventId);
    qc.invalidateQueries({ queryKey: ["performance-slots", selectedSubEventId] });
    toast({ title: "All slots cleared" });
  };

  const bookedCount = slots?.filter(s => s.is_booked).length || 0;

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Performance Time Slots
          </CardTitle>
          <CardDescription>Generate time slots and manage order of performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Level</label>
              <Select value={selectedLevelId} onValueChange={(v) => { setSelectedLevelId(v); setSelectedSubEventId(""); }}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  {levels?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Sub-Event</label>
              <Select value={selectedSubEventId} onValueChange={setSelectedSubEventId}>
                <SelectTrigger><SelectValue placeholder="Select sub-event" /></SelectTrigger>
                <SelectContent>
                  {subEvents?.map(se => <SelectItem key={se.id} value={se.id}>{se.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedSubEventId && (
            <>
              <div className="border border-border/30 rounded-md p-3 bg-muted/20 space-y-3">
                <p className="text-xs font-medium text-foreground">Generate Slots</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Start Time</label>
                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Slot Count</label>
                    <Input type="number" min={1} max={50} value={slotCount} onChange={e => setSlotCount(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Duration (min)</label>
                    <Input type="number" min={1} max={30} value={slotDuration} onChange={e => setSlotDuration(e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={generateSlots}>
                    <Zap className="h-3.5 w-3.5 mr-1" /> Generate
                  </Button>
                  {slots && slots.length > 0 && (
                    <Button size="sm" variant="outline" className="text-destructive" onClick={clearAllSlots}>
                      Clear All
                    </Button>
                  )}
                </div>
              </div>

              {isLoading ? (
                <p className="text-sm text-muted-foreground animate-pulse">Loading slots…</p>
              ) : slots && slots.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">
                      {slots.length} slots · {bookedCount} booked · {slots.length - bookedCount} available
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs w-[40px]">#</TableHead>
                          <TableHead className="text-xs">Time</TableHead>
                          <TableHead className="text-xs">Performer</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs w-[40px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {slots.map(slot => (
                          <TableRow key={slot.id}>
                            <TableCell className="font-mono text-xs text-muted-foreground">{slot.slot_index + 1}</TableCell>
                            <TableCell className="text-sm font-mono">
                              {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {slot.performer_name ? (
                                <span className="font-medium">{slot.performer_name}</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {slot.is_booked ? (
                                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-[10px]">Booked</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-secondary/20 text-secondary border-secondary/30 text-[10px]">Available</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {!slot.is_booked && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSlot(slot.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No slots created yet. Use the form above to generate them.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedSubEventId && (
        <PerformanceOrder subEventId={selectedSubEventId} />
      )}
    </div>
  );
}
