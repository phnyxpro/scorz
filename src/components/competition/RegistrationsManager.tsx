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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, UserPlus, Search, ShieldAlert, Clock, GripVertical, Upload, ArrowUpDown, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
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
  no_show: "bg-muted text-muted-foreground border-muted-foreground/30",
  disqualified: "bg-destructive/20 text-destructive border-destructive/30",
  drop_out: "bg-muted text-muted-foreground border-muted-foreground/30",
};

const ALL_STATUSES = ["approved", "pending", "rejected", "no_show", "disqualified", "drop_out"];

type SortField = "sort_order" | "name" | "email" | "age" | "status" | "slot";
type SortDir = "asc" | "desc";

// ─── Slot Picker Cell ──────────────────────────────────────────────
interface SlotPickerCellProps {
  regId: string;
  subEventId: string | null;
  slot?: { id: string; start_time: string; end_time: string };
  allSlots: { id: string; start_time: string; end_time: string; contestant_registration_id: string | null; is_booked: boolean; sub_event_id: string }[];
  onAssign: (regId: string, slotId: string) => void;
  onUpdate: (slotId: string, startTime: string, endTime: string) => void;
  formatTime: (time: string) => string;
}

function SlotPickerCell({ regId, subEventId, slot, allSlots, onAssign, onUpdate, formatTime }: SlotPickerCellProps) {
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  // Available slots: same sub-event, unbooked OR currently assigned to this reg
  const available = allSlots.filter(
    (s) => s.sub_event_id === subEventId && (!s.is_booked || s.contestant_registration_id === regId)
  );

  const handleSelectSlot = (slotId: string) => {
    onAssign(regId, slotId);
    setOpen(false);
  };

  const handleEditSave = () => {
    if (slot) {
      onUpdate(slot.id, editStart + ":00", editEnd + ":00");
    }
    setEditMode(false);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o && slot) {
        setEditStart(slot.start_time?.slice(0, 5) || "");
        setEditEnd(slot.end_time?.slice(0, 5) || "");
      }
      if (!o) setEditMode(false);
    }}>
      <PopoverTrigger asChild>
        <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 whitespace-nowrap">
          <Clock className="h-3 w-3" />
          {slot ? `${formatTime(slot.start_time)} – ${formatTime(slot.end_time)}` : "Assign slot"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-2" align="start">
        {!editMode ? (
          <>
            <p className="text-xs font-medium text-foreground">
              {slot ? "Change Slot" : "Select Slot"}
            </p>
            {available.length === 0 ? (
              <p className="text-xs text-muted-foreground">No available slots</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {available.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSlot(s.id)}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent ${
                      slot?.id === s.id ? "bg-accent font-medium" : ""
                    }`}
                  >
                    {formatTime(s.start_time)} – {formatTime(s.end_time)}
                    {s.contestant_registration_id === regId && (
                      <span className="text-muted-foreground ml-1">(current)</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {slot && (
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs mt-1"
                onClick={() => setEditMode(true)}
              >
                Edit Time Manually
              </Button>
            )}
          </>
        ) : (
          <>
            <p className="text-xs font-medium text-foreground">Edit Slot Time</p>
            <div className="space-y-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Start</Label>
                <Input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">End</Label>
                <Input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
              <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleEditSave}>
                Save
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Sortable Row ──────────────────────────────────────────────────
interface SortableRowProps {
  reg: ContestantRegistration;
  idx: number;
  totalCount: number;
  slot?: { id: string; start_time: string; end_time: string };
  allSlots: { id: string; start_time: string; end_time: string; contestant_registration_id: string | null; is_booked: boolean; sub_event_id: string }[];
  onSlotAssign: (regId: string, slotId: string) => void;
  onSlotUpdate: (slotId: string, startTime: string, endTime: string) => void;
  formatTime: (time: string) => string;
  onSelect: (reg: ContestantRegistration) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onMoveUp: (regId: string) => void;
  onMoveDown: (regId: string) => void;
  onInlineNameSave: (regId: string, newName: string) => void;
  onInlineNumberSave: (regId: string, newPosition: number) => void;
}

function SortableRow({ reg, idx, totalCount, slot, allSlots, onSlotAssign, onSlotUpdate, formatTime, onSelect, onApprove, onReject, onStatusChange, onMoveUp, onMoveDown, onInlineNameSave, onInlineNumberSave }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: reg.id });
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(reg.full_name);
  const [editingNumber, setEditingNumber] = useState(false);
  const [editNumber, setEditNumber] = useState(String(idx + 1));

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const saveName = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== reg.full_name) {
      onInlineNameSave(reg.id, trimmed);
    }
    setEditingName(false);
  };

  const saveNumber = () => {
    const num = parseInt(editNumber, 10);
    if (!isNaN(num) && num >= 1 && num <= totalCount && num !== idx + 1) {
      onInlineNumberSave(reg.id, num);
    }
    setEditingNumber(false);
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "bg-muted/50" : ""}>
      <TableCell className="w-[60px]">
        <div className="flex items-center gap-0.5">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground">
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex flex-col">
            <button className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={idx === 0} onClick={() => onMoveUp(reg.id)}>
              <ChevronUp className="h-3 w-3" />
            </button>
            <button className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={idx === totalCount - 1} onClick={() => onMoveDown(reg.id)}>
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {editingNumber ? (
          <Input
            value={editNumber}
            onChange={(e) => setEditNumber(e.target.value)}
            onBlur={saveNumber}
            onKeyDown={(e) => { if (e.key === "Enter") saveNumber(); if (e.key === "Escape") setEditingNumber(false); }}
            className="h-6 w-10 text-xs font-mono px-1 text-center"
            type="number"
            min={1}
            max={totalCount}
            autoFocus
          />
        ) : (
          <button className="hover:text-foreground hover:underline" onClick={() => { setEditNumber(String(idx + 1)); setEditingNumber(true); }}>
            {idx + 1}
          </button>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 flex-wrap">
          {editingName ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
              className="h-7 text-sm w-48"
              autoFocus
            />
          ) : (
            <button
              className="text-sm font-medium text-primary hover:underline text-left"
              onClick={() => onSelect(reg)}
              onDoubleClick={(e) => { e.preventDefault(); setEditName(reg.full_name); setEditingName(true); }}
            >
              {reg.full_name}
            </button>
          )}
          {(reg as any).special_entry_type && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {(reg as any).special_entry_type === "previous_winner" ? "Previous Winner"
                : (reg as any).special_entry_type === "wild_card" ? "Wild Card"
                : (reg as any).special_entry_type === "sub_competition_winner" ? "Sub-Comp Winner"
                : (reg as any).special_entry_type}
            </Badge>
          )}
        </div>
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
        <SlotPickerCell
          regId={reg.id}
          subEventId={reg.sub_event_id}
          slot={slot}
          allSlots={allSlots}
          onAssign={onSlotAssign}
          onUpdate={onSlotUpdate}
          formatTime={formatTime}
        />
      </TableCell>
      <TableCell>
        <Popover>
          <PopoverTrigger asChild>
            <button className="cursor-pointer">
              <Badge variant="outline" className={`text-[10px] ${statusColor[reg.status] || ""} hover:opacity-80 transition-opacity`}>
                {reg.status}
              </Badge>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-36 p-1" align="start">
            <p className="text-[10px] text-muted-foreground px-2 py-1 font-medium">Change status</p>
            {ALL_STATUSES.map(s => (
              <button
                key={s}
                disabled={s === reg.status}
                onClick={() => onStatusChange(reg.id, s)}
                className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent disabled:opacity-40 flex items-center gap-1.5 ${s === reg.status ? "font-semibold" : ""}`}
              >
                <Badge variant="outline" className={`text-[9px] ${statusColor[s] || ""}`}>{s}</Badge>
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          {reg.status === "pending" && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-secondary hover:text-secondary" onClick={() => onApprove(reg.id)} title="Approve">
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onReject(reg.id)} title="Reject">
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          {reg.status === "rejected" && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onApprove(reg.id)}>Re-approve</Button>
          )}
          {reg.status === "approved" && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => onReject(reg.id)}>Revoke</Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Sortable Column Header ───────────────────────────────────────
function SortHeader({ label, field, sortField, sortDir, onSort }: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const active = sortField === field;
  return (
    <button className="flex items-center gap-0.5 text-xs hover:text-foreground" onClick={() => onSort(field)}>
      {label}
      {active ? (
        sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-30" />
      )}
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────
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
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAge, setFilterAge] = useState("all");
  const [sortField, setSortField] = useState<SortField>("sort_order");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [activeSubEventTab, setActiveSubEventTab] = useState("all");
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [showAddContestant, setShowAddContestant] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInEmail, setWalkInEmail] = useState("");
  const [walkInAge, setWalkInAge] = useState("adult");
  const [walkInConsent, setWalkInConsent] = useState(false);
  const [walkInSubEvent, setWalkInSubEvent] = useState("");
  const [walkInAfterLastTimed, setWalkInAfterLastTimed] = useState(false);
  const [walkInPosition, setWalkInPosition] = useState("");
  const [selectedReg, setSelectedReg] = useState<ContestantRegistration | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Fetch all sub-events across all levels
  const allLevelIds = levels?.map((l) => l.id) || [];
  const { data: allSubEvents } = useQuery({
    queryKey: ["all_sub_events_for_comp", competitionId, allLevelIds.length],
    enabled: allLevelIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_events")
        .select("id, name, level_id")
        .in("level_id", allLevelIds)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch performance slots for all registrations
  const regIds = registrations?.map((r) => r.id) || [];
  const { data: slotsData } = useQuery({
    queryKey: ["performance_slots_for_regs", competitionId, regIds.length],
    enabled: regIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_slots")
        .select("id, contestant_registration_id, start_time, end_time, sub_event_id, is_booked")
        .in("contestant_registration_id", regIds);
      if (error) throw error;
      return data;
    },
  });

  // Fetch ALL slots for all sub-events in this competition so the picker always works
  const allSubEventIds = allSubEvents?.map((se) => se.id) || [];
  const { data: allSlotsRaw } = useQuery({
    queryKey: ["available_slots", competitionId, allSubEventIds.length],
    enabled: allSubEventIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_slots")
        .select("id, contestant_registration_id, start_time, end_time, sub_event_id, is_booked")
        .in("sub_event_id", allSubEventIds)
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });

  // Combine all slots (from both queries) for the picker, keyed by sub-event
  const allSlotsForPicker = useMemo(() => {
    const map = new Map<string, typeof allSlotsRaw extends (infer T)[] | undefined ? T : never>();
    allSlotsRaw?.forEach((s) => map.set(s.id, s));
    slotsData?.forEach((s) => { if (!map.has(s.id)) map.set(s.id, s); });
    return Array.from(map.values());
  }, [allSlotsRaw, slotsData]);

  // Map registration id -> slot
  const slotsByRegId = useMemo(() => {
    const map: Record<string, { id: string; start_time: string; end_time: string }> = {};
    slotsData?.forEach((s) => {
      if (s.contestant_registration_id) {
        map[s.contestant_registration_id] = { id: s.id, start_time: s.start_time, end_time: s.end_time };
      }
    });
    return map;
  }, [slotsData]);

  // Get unique sub-events from registrations
  const subEventIds = useMemo(() => {
    const ids = new Set<string>();
    registrations?.forEach((r) => { if (r.sub_event_id) ids.add(r.sub_event_id); });
    return Array.from(ids);
  }, [registrations]);

  const subEventMap = useMemo(() => {
    const map: Record<string, string> = {};
    allSubEvents?.forEach((se) => { map[se.id] = se.name; });
    return map;
  }, [allSubEvents]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    if (!registrations) return [];
    let list = [...registrations];

    // Sub-event tab filter
    if (activeSubEventTab === "unassigned") {
      list = list.filter((r) => !r.sub_event_id);
    } else if (activeSubEventTab !== "all") {
      list = list.filter((r) => r.sub_event_id === activeSubEventTab);
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
    }

    // Status filter
    if (filterStatus !== "all") {
      list = list.filter((r) => r.status === filterStatus);
    }

    // Age filter
    if (filterAge !== "all") {
      if (filterAge === "minor") {
        list = list.filter((r) => r.age_category === "minor");
      } else if (filterAge === "adult_all") {
        list = list.filter((r) => r.age_category !== "minor");
      } else {
        list = list.filter((r) => r.age_category === filterAge);
      }
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "sort_order":
          cmp = ((a as any).sort_order || 0) - ((b as any).sort_order || 0);
          if (cmp === 0) {
            const slotA = slotsByRegId[a.id]?.start_time || "";
            const slotB = slotsByRegId[b.id]?.start_time || "";
            cmp = slotA.localeCompare(slotB);
          }
          break;
        case "name":
          cmp = a.full_name.localeCompare(b.full_name);
          break;
        case "email":
          cmp = a.email.localeCompare(b.email);
          break;
        case "age":
          cmp = a.age_category.localeCompare(b.age_category);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "slot": {
          const sa = slotsByRegId[a.id]?.start_time || "zzz";
          const sb = slotsByRegId[b.id]?.start_time || "zzz";
          cmp = sa.localeCompare(sb);
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [registrations, search, filterStatus, filterAge, activeSubEventTab, sortField, sortDir, slotsByRegId]);

  // Reset page when filters change
  const filteredLen = filtered.length;
  const totalPages = Math.max(1, Math.ceil(filteredLen / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedFiltered = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Reset to page 1 when filters change
  useMemo(() => { setCurrentPage(1); }, [search, filterStatus, filterAge, activeSubEventTab]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filtered.findIndex((r) => r.id === active.id);
    const newIndex = filtered.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = [...filtered];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const updates = reordered.map((r, i) => ({ id: r.id, sort_order: i }));
    for (const u of updates) {
      await supabase.from("contestant_registrations").update({ sort_order: u.sort_order } as any).eq("id", u.id);
    }
    qc.invalidateQueries({ queryKey: ["registrations", competitionId] });
    qc.invalidateQueries({ queryKey: ["judging_overview"] });
    qc.invalidateQueries({ queryKey: ["approved-contestants-order"] });
  };

  const handleMoveUp = async (regId: string) => {
    const idx = filtered.findIndex(r => r.id === regId);
    if (idx <= 0) return;
    const reordered = [...filtered];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(idx - 1, 0, moved);
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from("contestant_registrations").update({ sort_order: i } as any).eq("id", reordered[i].id);
    }
    qc.invalidateQueries({ queryKey: ["registrations", competitionId] });
    qc.invalidateQueries({ queryKey: ["approved-contestants-order"] });
  };

  const handleMoveDown = async (regId: string) => {
    const idx = filtered.findIndex(r => r.id === regId);
    if (idx < 0 || idx >= filtered.length - 1) return;
    const reordered = [...filtered];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(idx + 1, 0, moved);
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from("contestant_registrations").update({ sort_order: i } as any).eq("id", reordered[i].id);
    }
    qc.invalidateQueries({ queryKey: ["registrations", competitionId] });
    qc.invalidateQueries({ queryKey: ["approved-contestants-order"] });
  };

  const handleInlineNameSave = (regId: string, newName: string) => {
    updateReg.mutate({ id: regId, full_name: newName } as any);
  };

  const handleInlineNumberSave = async (regId: string, newPosition: number) => {
    const idx = filtered.findIndex(r => r.id === regId);
    if (idx < 0) return;
    const targetIdx = newPosition - 1;
    const reordered = [...filtered];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(Math.min(targetIdx, reordered.length), 0, moved);
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from("contestant_registrations").update({ sort_order: i } as any).eq("id", reordered[i].id);
    }
    qc.invalidateQueries({ queryKey: ["registrations", competitionId] });
    qc.invalidateQueries({ queryKey: ["approved-contestants-order"] });
  };

  const sendNotification = async (registrationId: string, status: string) => {
    try {
      const { data: comp } = await supabase.from("competitions").select("name").eq("id", competitionId).single();
      await supabase.functions.invoke("notify-registration-status", {
        body: { registration_id: registrationId, status, competition_name: comp?.name || "Competition" },
      });
    } catch (e) {
      console.error("Failed to send notification:", e);
    }
  };

  const handleApprove = (id: string) => {
    updateReg.mutate({ id, status: "approved" } as any, { onSuccess: () => sendNotification(id, "approved") });
  };

  const handleReject = (id: string) => {
    updateReg.mutate({ id, status: "rejected" } as any, { onSuccess: () => sendNotification(id, "rejected") });
  };

  const handleSlotTimeUpdate = async (slotId: string, startTime: string, endTime: string) => {
    const { error } = await supabase.from("performance_slots").update({ start_time: startTime, end_time: endTime }).eq("id", slotId);
    if (error) {
      toast({ title: "Error updating slot", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Slot time updated" });
      qc.invalidateQueries({ queryKey: ["performance_slots_for_regs", competitionId] });
      qc.invalidateQueries({ queryKey: ["available_slots"] });
    }
  };

  const handleSlotAssign = async (regId: string, slotId: string) => {
    // Unbook the current slot if any
    const currentSlot = slotsByRegId[regId];
    if (currentSlot) {
      await supabase.from("performance_slots").update({ contestant_registration_id: null, is_booked: false }).eq("id", currentSlot.id);
    }
    // Book the new slot
    const { error } = await supabase.from("performance_slots").update({ contestant_registration_id: regId, is_booked: true }).eq("id", slotId);
    if (error) {
      toast({ title: "Error assigning slot", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Slot assigned" });
      qc.invalidateQueries({ queryKey: ["performance_slots_for_regs", competitionId] });
      qc.invalidateQueries({ queryKey: ["available_slots"] });
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
      const { data: existingProfile } = await supabase.from("profiles").select("user_id").eq("email", walkInEmail).maybeSingle();
      const userId = existingProfile?.user_id || user.id;

      // Calculate sort_order based on options
      let sortOrder = 0;
      const targetSubEvent = walkInSubEvent || undefined;
      if (walkInPosition && parseInt(walkInPosition, 10) > 0) {
        sortOrder = parseInt(walkInPosition, 10);
        // Shift existing contestants at or after this position
        const toShift = registrations?.filter(r =>
          (targetSubEvent ? r.sub_event_id === targetSubEvent : true) &&
          ((r as any).sort_order || 0) >= sortOrder
        ) || [];
        for (const r of toShift) {
          await supabase.from("contestant_registrations").update({ sort_order: ((r as any).sort_order || 0) + 1 } as any).eq("id", r.id);
        }
      } else if (walkInAfterLastTimed && targetSubEvent) {
        // Find last timed contestant position
        const { data: durs } = await supabase.from("performance_durations").select("contestant_registration_id").eq("sub_event_id", targetSubEvent);
        const timedIds = new Set(durs?.map(d => d.contestant_registration_id) || []);
        const subRegs = registrations?.filter(r => r.sub_event_id === targetSubEvent).sort((a, b) => ((a as any).sort_order || 0) - ((b as any).sort_order || 0)) || [];
        let lastTimedOrder = 0;
        subRegs.forEach(r => { if (timedIds.has(r.id)) lastTimedOrder = (r as any).sort_order || 0; });
        sortOrder = lastTimedOrder + 1;
        // Shift
        const toShift = subRegs.filter(r => ((r as any).sort_order || 0) >= sortOrder);
        for (const r of toShift) {
          await supabase.from("contestant_registrations").update({ sort_order: ((r as any).sort_order || 0) + 1 } as any).eq("id", r.id);
        }
      } else {
        // Default: end of list
        const maxOrder = registrations?.reduce((max, r) => Math.max(max, (r as any).sort_order || 0), 0) || 0;
        sortOrder = maxOrder + 1;
      }

      await createReg.mutateAsync({
        user_id: userId,
        competition_id: competitionId,
        full_name: walkInName,
        email: walkInEmail,
        age_category: walkInAge,
        status: "approved",
        rules_acknowledged: true,
        ...(targetSubEvent ? { sub_event_id: targetSubEvent } : {}),
        sort_order: sortOrder,
      } as any);
      setShowWalkIn(false);
      setWalkInName("");
      setWalkInEmail("");
      setWalkInAge("adult");
      setWalkInConsent(false);
      setWalkInSubEvent("");
      setWalkInAfterLastTimed(false);
      setWalkInPosition("");
      qc.invalidateQueries({ queryKey: ["registrations", competitionId] });
      qc.invalidateQueries({ queryKey: ["approved-contestants-order"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  // Count per sub-event (must be before early return)
  const countBySubEvent = useMemo(() => {
    const map: Record<string, number> = { all: registrations?.length || 0 };
    registrations?.forEach((r) => {
      const key = r.sub_event_id || "unassigned";
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [registrations]);

  if (isLoading) return <div className="text-muted-foreground text-sm animate-pulse">Loading registrations…</div>;

  const pendingCount = registrations?.filter((r) => r.status === "pending").length || 0;
  const hasSubEvents = subEventIds.length > 0;

  const renderTable = () => (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-[40px]"></TableHead>
                <TableHead className="text-xs w-[40px]">
                  <SortHeader label="#" field="sort_order" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                </TableHead>
                <TableHead className="text-xs">
                  <SortHeader label="Name" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                </TableHead>
                <TableHead className="text-xs">
                  <SortHeader label="Email" field="email" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                </TableHead>
                <TableHead className="text-xs">
                  <SortHeader label="Age" field="age" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                </TableHead>
                <TableHead className="text-xs">
                  <SortHeader label="Scheduled Slot" field="slot" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                </TableHead>
                <TableHead className="text-xs">
                  <SortHeader label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                </TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <SortableContext items={paginatedFiltered.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <TableBody>
                {paginatedFiltered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                      No registrations found.
                    </TableCell>
                  </TableRow>
                )}
                {paginatedFiltered.map((reg, idx) => (
                  <SortableRow
                    key={reg.id}
                    reg={reg}
                    idx={(safePage - 1) * pageSize + idx}
                    totalCount={filtered.length}
                    slot={slotsByRegId[reg.id]}
                    allSlots={allSlotsForPicker}
                    onSlotAssign={handleSlotAssign}
                    onSlotUpdate={handleSlotTimeUpdate}
                    formatTime={formatSlotTime}
                    onSelect={setSelectedReg}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onStatusChange={(id, status) => {
                      updateReg.mutate({ id, status } as any, {
                        onSuccess: () => sendNotification(id, status),
                      });
                    }}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    onInlineNameSave={handleInlineNameSave}
                    onInlineNumberSave={handleInlineNumberSave}
                  />
                ))}
              </TableBody>
            </SortableContext>
          </Table>
        </DndContext>
      </div>
      <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredLen)} of {filteredLen}
            </p>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="h-7 w-[80px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[20, 50, 100].map(n => (
                  <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(safePage - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | "...")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1]) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`dots-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                ) : (
                  <Button
                    key={p}
                    variant={safePage === p ? "default" : "outline"}
                    size="icon"
                    className="h-7 w-7 text-xs"
                    onClick={() => setCurrentPage(p as number)}
                  >
                    {p}
                  </Button>
                )
              )}
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(safePage + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Contestant Registrations</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {registrations?.length || 0} total · {pendingCount} pending · {filtered.length} shown
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
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
          {/* Filters Row */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-[130px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
                <SelectItem value="disqualified">Disqualified</SelectItem>
                <SelectItem value="drop_out">Drop Out</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAge} onValueChange={setFilterAge}>
              <SelectTrigger className="h-9 w-[140px] text-xs">
                <SelectValue placeholder="Age" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                <SelectItem value="adult_all">Adults (all)</SelectItem>
                <SelectItem value="adult_18_24">Adult | 18-24</SelectItem>
                <SelectItem value="adult_25_34">Adult | 25-34</SelectItem>
                <SelectItem value="adult_35_44">Adult | 35-44</SelectItem>
                <SelectItem value="adult_45_54">Adult | 45-54</SelectItem>
                <SelectItem value="adult_55_plus">Adult | 55+</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sub-event tabs or direct table */}
          {hasSubEvents ? (
            <Tabs value={activeSubEventTab} onValueChange={setActiveSubEventTab}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs h-7 px-3">
                  All ({countBySubEvent.all || 0})
                </TabsTrigger>
                {subEventIds.map((seId) => (
                  <TabsTrigger key={seId} value={seId} className="text-xs h-7 px-3">
                    {subEventMap[seId] || "Unknown"} ({countBySubEvent[seId] || 0})
                  </TabsTrigger>
                ))}
                {countBySubEvent.unassigned > 0 && (
                  <TabsTrigger value="unassigned" className="text-xs h-7 px-3">
                    Unassigned ({countBySubEvent.unassigned})
                  </TabsTrigger>
                )}
              </TabsList>
              {renderTable()}
            </Tabs>
          ) : (
            renderTable()
          )}
        </CardContent>
      </Card>

      {/* Walk-in Dialog */}
      <Dialog open={showWalkIn} onOpenChange={setShowWalkIn}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Quick Add Walk-in Contestant</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Full Name" value={walkInName} onChange={(e) => setWalkInName(e.target.value)} />
            <Input placeholder="Email" type="email" value={walkInEmail} onChange={(e) => setWalkInEmail(e.target.value)} />
            <Select value={walkInAge} onValueChange={setWalkInAge}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="adult">Adult</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
              </SelectContent>
            </Select>
            {/* Sub-event assignment */}
            {allSubEvents && allSubEvents.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Assign to Event</Label>
                <Select value={walkInSubEvent} onValueChange={setWalkInSubEvent}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select event (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No event</SelectItem>
                    {allSubEvents.map(se => (
                      <SelectItem key={se.id} value={se.id}>{se.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Position options */}
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="walk-in-after-timed"
                  checked={walkInAfterLastTimed}
                  onCheckedChange={(v) => {
                    setWalkInAfterLastTimed(!!v);
                    if (v) setWalkInPosition("");
                  }}
                  disabled={!walkInSubEvent}
                />
                <Label htmlFor="walk-in-after-timed" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                  Place after last timed performer
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Or position #</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 5"
                  value={walkInPosition}
                  onChange={(e) => {
                    setWalkInPosition(e.target.value);
                    if (e.target.value) setWalkInAfterLastTimed(false);
                  }}
                  className="h-8 w-20 text-xs"
                />
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="walk-in-consent" checked={walkInConsent} onCheckedChange={(v) => setWalkInConsent(!!v)} />
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
