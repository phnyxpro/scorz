import { useState, useMemo } from "react";
import { useRegistrations, useUpdateRegistration, useCreateRegistration } from "@/hooks/useRegistrations";
import { useSubEvents, useLevels } from "@/hooks/useCompetitions";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, UserPlus, Search, ShieldAlert, Clock, GripVertical, Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ContestantDetailSheet } from "./ContestantDetailSheet";
import { ContestantRegistration } from "@/hooks/useRegistrations";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { OnBehalfRegistrationForm } from "@/pages/ContestantRegistration";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BulkUploadDialog } from "./BulkUploadDialog";
import { getAgeCategoryLabel } from "@/lib/age-categories";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

const statusColor: Record<string, string> = {
  approved: "bg-secondary/20 text-secondary border-secondary/30",
  pending: "bg-primary/20 text-primary border-primary/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
};

interface SlotTimeCellProps {
  slot?: { id: string; start_time: string; end_time: string };
  onUpdate: (slotId: string, startTime: string, endTime: string) => void;
  formatTime: (time: string) => string;
}

function SlotTimeCell({ slot, onUpdate, formatTime }: SlotTimeCellProps) {
  const [editStart, setEditStart] = useState(slot?.start_time?.slice(0, 5) || "");
  const [editEnd, setEditEnd] = useState(slot?.end_time?.slice(0, 5) || "");
  const [open, setOpen] = useState(false);

  if (!slot) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const handleSave = () => {
    onUpdate(slot.id, editStart + ":00", editEnd + ":00");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => {
      if (o) {
        setEditStart(slot.start_time?.slice(0, 5) || "");
        setEditEnd(slot.end_time?.slice(0, 5) || "");
      }
      setOpen(o);
    }}>
      <PopoverTrigger asChild>
        <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 whitespace-nowrap">
          <Clock className="h-3 w-3" />
          {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 space-y-3 p-3" align="start">
        <p className="text-xs font-medium text-foreground">Edit Slot Time</p>
        <div className="space-y-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Start</Label>
            <Input type="time" value={editStart} onChange={e => setEditStart(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">End</Label>
            <Input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)} className="h-8 text-sm" />
          </div>
        </div>
        <Button size="sm" className="w-full h-7 text-xs" onClick={handleSave}>Save</Button>
      </PopoverContent>
    </Popover>
  );
}

interface SortableRowProps {
  reg: ContestantRegistration;
  idx: number;
  slot?: { id: string; start_time: string; end_time: string };
  onSlotUpdate: (slotId: string, startTime: string, endTime: string) => void;
  formatTime: (time: string) => string;
  onSelect: (reg: ContestantRegistration) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

function SortableRow({ reg, idx, slot, onSlotUpdate, formatTime, onSelect, onApprove, onReject }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: reg.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "bg-muted/50" : ""}>
      <TableCell className="w-[40px]">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
      <TableCell>
        <button
          className="text-sm font-medium text-primary hover:underline text-left"
          onClick={() => onSelect(reg)}
        >
          {reg.full_name}
        </button>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground font-mono">{reg.email}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[10px]">
            {getAgeCategoryLabel(reg.age_category)}
          </Badge>
          {reg.age_category === "minor" && !reg.guardian_name && (
            <Badge variant="outline" className="text-[10px] gap-0.5 border-amber-500/50 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-2.5 w-2.5" /> No Guardian
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <SlotTimeCell
          slot={slot}
          onUpdate={onSlotUpdate}
          formatTime={formatTime}
        />
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={`text-[10px] ${statusColor[reg.status] || ""}`}>
          {reg.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          {reg.status === "pending" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-secondary hover:text-secondary"
                onClick={() => onApprove(reg.id)}
                title="Approve"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onReject(reg.id)}
                title="Reject"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          {reg.status === "rejected" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onApprove(reg.id)}
            >
              Re-approve
            </Button>
          )}
          {reg.status === "approved" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive"
              onClick={() => onReject(reg.id)}
            >
              Revoke
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

interface Props {
  competitionId: string;
}

export function RegistrationsManager({ competitionId }: Props) {
  const { data: registrations, isLoading } = useRegistrations(competitionId);
  const { data: levels } = useLevels(competitionId);
  const updateReg = useUpdateRegistration();
  const createReg = useCreateRegistration();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterSubEvent, setFilterSubEvent] = useState("all");
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [showAddContestant, setShowAddContestant] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInEmail, setWalkInEmail] = useState("");
  const [walkInAge, setWalkInAge] = useState("adult");
  const [walkInConsent, setWalkInConsent] = useState(false);
  const [selectedReg, setSelectedReg] = useState<ContestantRegistration | null>(null);

  const allLevelIds = levels?.map(l => l.id) || [];
  const firstLevelId = allLevelIds[0];
  const { data: subEventsFirst } = useSubEvents(firstLevelId);

  // Fetch performance slots for all registrations in this competition
  const regIds = registrations?.map(r => r.id) || [];
  const { data: slotsData } = useQuery({
    queryKey: ["performance_slots_for_regs", competitionId, regIds.length],
    enabled: regIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_slots")
        .select("id, contestant_registration_id, start_time, end_time, sub_event_id")
        .in("contestant_registration_id", regIds);
      if (error) throw error;
      return data;
    },
  });

  // Map registration id -> slot
  const slotsByRegId = useMemo(() => {
    const map: Record<string, { id: string; start_time: string; end_time: string }> = {};
    slotsData?.forEach(s => {
      if (s.contestant_registration_id) {
        map[s.contestant_registration_id] = { id: s.id, start_time: s.start_time, end_time: s.end_time };
      }
    });
    return map;
  }, [slotsData]);

  const filtered = useMemo(() => {
    if (!registrations) return [];
    let list = [...registrations];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
    }
    if (filterSubEvent !== "all") {
      list = list.filter(r => r.sub_event_id === filterSubEvent);
    }
    // Primary sort by sort_order, secondary by scheduled slot start_time
    list.sort((a, b) => {
      const orderA = (a as any).sort_order || 0;
      const orderB = (b as any).sort_order || 0;
      if (orderA !== orderB) return orderA - orderB;
      // Secondary: scheduled slot start_time
      const slotA = slotsByRegId[a.id]?.start_time || "";
      const slotB = slotsByRegId[b.id]?.start_time || "";
      return slotA.localeCompare(slotB);
    });
    return list;
  }, [registrations, search, filterSubEvent, slotsByRegId]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filtered.findIndex(r => r.id === active.id);
    const newIndex = filtered.findIndex(r => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    // Reorder: assign new sort_order values based on position
    const reordered = [...filtered];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Batch update sort_order for all affected items
    const updates = reordered.map((r, i) => ({ id: r.id, sort_order: i }));
    
    // Optimistic: update all sort_orders
    for (const u of updates) {
      await supabase.from("contestant_registrations").update({ sort_order: u.sort_order } as any).eq("id", u.id);
    }
    qc.invalidateQueries({ queryKey: ["registrations", competitionId] });
  };

  const sendNotification = async (registrationId: string, status: string) => {
    try {
      const { data: comp } = await supabase
        .from("competitions")
        .select("name")
        .eq("id", competitionId)
        .single();

      await supabase.functions.invoke("notify-registration-status", {
        body: {
          registration_id: registrationId,
          status,
          competition_name: comp?.name || "Competition",
        },
      });
    } catch (e) {
      console.error("Failed to send notification:", e);
    }
  };

  const handleApprove = (id: string) => {
    updateReg.mutate({ id, status: "approved" } as any, {
      onSuccess: () => sendNotification(id, "approved"),
    });
  };

  const handleReject = (id: string) => {
    updateReg.mutate({ id, status: "rejected" } as any, {
      onSuccess: () => sendNotification(id, "rejected"),
    });
  };

  const handleSlotTimeUpdate = async (slotId: string, startTime: string, endTime: string) => {
    const { error } = await supabase
      .from("performance_slots")
      .update({ start_time: startTime, end_time: endTime })
      .eq("id", slotId);
    if (error) {
      toast({ title: "Error updating slot", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Slot time updated" });
      qc.invalidateQueries({ queryKey: ["performance_slots_for_regs", competitionId] });
    }
  };

  const formatSlotTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${h12}:${m} ${ampm}`;
  };

  const handleWalkInAdd = async () => {
    if (!walkInName || !walkInEmail || !user) return;
    try {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", walkInEmail)
        .maybeSingle();

      const userId = existingProfile?.user_id || user.id;

      await createReg.mutateAsync({
        user_id: userId,
        competition_id: competitionId,
        full_name: walkInName,
        email: walkInEmail,
        age_category: walkInAge,
        status: "approved",
        rules_acknowledged: true,
      });
      setShowWalkIn(false);
      setWalkInName("");
      setWalkInEmail("");
      setWalkInAge("adult");
      setWalkInConsent(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="text-muted-foreground text-sm animate-pulse">Loading registrations…</div>;

  const pendingCount = registrations?.filter(r => r.status === "pending").length || 0;

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Contestant Registrations</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {registrations?.length || 0} total · {pendingCount} pending approval · Drag to reorder
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowAddContestant(true)}>
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Contestant
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowBulkUpload(true)}>
                <Upload className="h-3.5 w-3.5 mr-1" /> Bulk Upload
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowWalkIn(true)}>
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Quick Walk-in
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-[40px]"></TableHead>
                    <TableHead className="text-xs w-[40px]">#</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Age</TableHead>
                    <TableHead className="text-xs">Scheduled Slot</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <SortableContext items={filtered.map(r => r.id)} strategy={verticalListSortingStrategy}>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                          No registrations found.
                        </TableCell>
                      </TableRow>
                    )}
                    {filtered.map((reg, idx) => (
                      <SortableRow
                        key={reg.id}
                        reg={reg}
                        idx={idx}
                        slot={slotsByRegId[reg.id]}
                        onSlotUpdate={handleSlotTimeUpdate}
                        formatTime={formatSlotTime}
                        onSelect={setSelectedReg}
                        onApprove={handleApprove}
                        onReject={handleReject}
                      />
                    ))}
                  </TableBody>
                </SortableContext>
              </Table>
            </DndContext>
          </div>
        </CardContent>
      </Card>

      {/* Walk-in Dialog */}
      <Dialog open={showWalkIn} onOpenChange={setShowWalkIn}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Quick Add Walk-in Contestant</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Full Name" value={walkInName} onChange={e => setWalkInName(e.target.value)} />
            <Input placeholder="Email" type="email" value={walkInEmail} onChange={e => setWalkInEmail(e.target.value)} />
            <Select value={walkInAge} onValueChange={setWalkInAge}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="adult">Adult</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-start gap-2">
              <Checkbox
                id="walk-in-consent"
                checked={walkInConsent}
                onCheckedChange={(v) => setWalkInConsent(!!v)}
              />
              <Label htmlFor="walk-in-consent" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                I confirm the contestant has verbally acknowledged the competition rules and consents to registration on their behalf.
              </Label>
            </div>
            <Button onClick={handleWalkInAdd} disabled={!walkInName || !walkInEmail || !walkInConsent || createReg.isPending} className="w-full">
              {createReg.isPending ? "Adding…" : "Add & Approve"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Contestant Sheet */}
      <Sheet open={showAddContestant} onOpenChange={setShowAddContestant}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Contestant</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <OnBehalfRegistrationForm
              competitionId={competitionId}
              onComplete={() => {
                setShowAddContestant(false);
                qc.invalidateQueries({ queryKey: ["registrations", competitionId] });
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Contestant Detail Sheet */}
      <ContestantDetailSheet
        registration={selectedReg}
        open={!!selectedReg}
        onOpenChange={(open) => { if (!open) setSelectedReg(null); }}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        competitionId={competitionId}
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
      />
    </div>
  );
}
