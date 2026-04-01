import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRegistrations, useUpdateRegistration, useCreateRegistration } from "@/hooks/useRegistrations";
import { useSubEvents, useLevels, useRubricCriteria, usePenaltyRules } from "@/hooks/useCompetitions";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, ArrowUp, ArrowDown, UserPlus, Search, ArrowRight, ArrowLeft, Users, ChevronRight, ChevronUp, ChevronDown, User, Info, Calendar, PenTool, Link as LinkIcon, Clock, GripVertical, ShieldAlert, ArrowUpDown, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { ContestantDetailSheet } from "./ContestantDetailSheet";
import { ContestantRegistration } from "@/hooks/useRegistrations";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/registration/SignaturePad";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useRegistrationFormConfig, createDefaultFormSchema, useCreateAdvancement } from "@/hooks/useRegistrationForm";
import { DynamicRegistrationForm } from "@/components/registration/DynamicRegistrationForm";
import { BulkUploadDialog } from "./BulkUploadDialog";
import { AIUploadDialog } from "./AIUploadDialog";
import { Upload, Sparkles as SparklesIcon } from "lucide-react";

const statusColor: Record<string, string> = {
  approved: "bg-secondary/20 text-secondary border-secondary/30",
  pending: "bg-primary/20 text-primary border-primary/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
  no_show: "bg-muted text-muted-foreground border-muted-foreground/30",
  disqualified: "bg-destructive/20 text-destructive border-destructive/30",
  drop_out: "bg-muted text-muted-foreground border-muted-foreground/30",
};

const ALL_STATUSES = ["approved", "pending", "rejected", "no_show", "disqualified", "drop_out"];
const getAgeCategoryLabel = (cat: string) => {
  if (cat === "minor") return "Minor";
  if (cat === "adult") return "Adult";
  return cat;
};
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
                    className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent ${slot?.id === s.id ? "bg-accent font-medium" : ""
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
  showSlotColumn: boolean;
}

function SortableRow({ reg, idx, totalCount, slot, allSlots, onSlotAssign, onSlotUpdate, formatTime, onSelect, onApprove, onReject, onStatusChange, onMoveUp, onMoveDown, onInlineNameSave, onInlineNumberSave, showSlotColumn }: SortableRowProps) {
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
      {showSlotColumn && (
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
      )}
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

/** Fetch ALL sub-events across all levels for this competition */
function useAllSubEvents(competitionId: string) {
  return useQuery({
    queryKey: ["all_sub_events_for_comp", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      // Get all levels
      const { data: levels, error: le } = await supabase
        .from("competition_levels")
        .select("*")
        .eq("competition_id", competitionId)
        .order("sort_order");
      if (le) throw le;

      const levelIds = (levels || []).map(l => l.id);
      if (!levelIds.length) return { levels: levels || [], subEvents: [] };

      const { data: subEvents, error: se } = await supabase
        .from("sub_events")
        .select("*")
        .in("level_id", levelIds)
        .order("event_date");
      if (se) throw se;

      return { levels: levels || [], subEvents: subEvents || [] };
    },
  });
}

export function RegistrationsManager({ competitionId }: Props) {
  const navigate = useNavigate();
  const { data: registrations, isLoading } = useRegistrations(competitionId);
  const { data: levels } = useLevels(competitionId);
  const { data: allData } = useAllSubEvents(competitionId);
  const updateReg = useUpdateRegistration();
  const createReg = useCreateRegistration();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: rubric } = useRubricCriteria(competitionId);
  const { data: penalties } = usePenaltyRules(competitionId);
  const { data: formConfig } = useRegistrationFormConfig(competitionId);
  const createAdvancement = useCreateAdvancement();

  const [search, setSearch] = useState("");
  const [filterLevelId, setFilterLevelId] = useState("all");
  const [filterSubEvent, setFilterSubEvent] = useState("all");
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showAIUpload, setShowAIUpload] = useState(false);
  const [activeSubEventTab, setActiveSubEventTab] = useState("all");
  const [filterAge, setFilterAge] = useState("all");
  const [sortField, setSortField] = useState<SortField>("sort_order");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [walkInSubEvent, setWalkInSubEvent] = useState("");
  const [walkInPosition, setWalkInPosition] = useState("");
  const [walkInAfterLastTimed, setWalkInAfterLastTimed] = useState(false);

  // Slots query
  const { data: slotsData } = useQuery({
    queryKey: ["performance_slots_for_regs", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const levelIds = (allData?.levels || []).map(l => l.id);
      if (!levelIds.length) return [];
      const seIds = (allData?.subEvents || []).map(se => se.id);
      if (!seIds.length) return [];
      const { data, error } = await supabase
        .from("performance_slots")
        .select("*")
        .in("sub_event_id", seIds);
      if (error) throw error;
      return data || [];
    },
  });

  const slotsByRegId = useMemo(() => {
    const m: Record<string, { id: string; start_time: string; end_time: string }> = {};
    (slotsData || []).forEach((s: any) => {
      if (s.contestant_registration_id) m[s.contestant_registration_id] = s;
    });
    return m;
  }, [slotsData]);

  const handleMoveOrder = async (regId: string, direction: "up" | "down") => {
    const idx = filtered.findIndex(r => r.id === regId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= filtered.length) return;
    const a = filtered[idx];
    const b = filtered[swapIdx];
    const orderA = (a as any).sort_order || idx;
    const orderB = (b as any).sort_order || swapIdx;
    await supabase.from("contestant_registrations").update({ sort_order: orderB } as any).eq("id", a.id);
    await supabase.from("contestant_registrations").update({ sort_order: orderA } as any).eq("id", b.id);
    qc.invalidateQueries({ queryKey: ["registrations", competitionId] });
  };

  const getAgeCategoryLabel = (cat: string) => {
    if (cat === "minor") return "Minor";
    if (cat === "adult") return "Adult";
    return cat;
  };

  const formSchema = useMemo(() => {
    if (formConfig?.form_schema && formConfig.form_schema.length > 0) return formConfig.form_schema;
    return createDefaultFormSchema();
  }, [formConfig]);

  // Bulk advance state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [advanceLevelId, setAdvanceLevelId] = useState("");
  const [advanceSubEventId, setAdvanceSubEventId] = useState("");
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Build sub-event lookup map
  const subEventMap = useMemo(() => {
    const m = new Map<string, { name: string; levelName: string; levelId: string }>();
    if (!allData) return m;
    const levelMap = new Map(allData.levels.map(l => [l.id, l.name]));
    for (const se of allData.subEvents) {
      m.set(se.id, { name: se.name, levelName: levelMap.get(se.level_id) || "Unknown", levelId: se.level_id });
    }
    return m;
  }, [allData]);

  // Sub-events for the filter dropdown (based on selected filter level)
  const filterSubEvents = useMemo(() => {
    if (!allData) return [];
    if (filterLevelId === "all") return allData.subEvents;
    return allData.subEvents.filter(se => se.level_id === filterLevelId);
  }, [allData, filterLevelId]);

  // Sub-events for the advance dialog dropdown
  const advanceSubEvents = useMemo(() => {
    if (!allData || !advanceLevelId) return [];
    return allData.subEvents.filter(se => se.level_id === advanceLevelId);
  }, [allData, advanceLevelId]);

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
    if (filterSubEvent !== "all") {
      if (filterSubEvent === "unassigned") {
        list = list.filter(r => !r.sub_event_id);
      } else {
        list = list.filter(r => r.sub_event_id === filterSubEvent);
      }
    } else if (filterLevelId !== "all") {
      // Filter by level - show all contestants assigned to any sub-event in this level
      const levelSubEventIds = new Set(
        (allData?.subEvents || []).filter(se => se.level_id === filterLevelId).map(se => se.id)
      );
      list = list.filter(r => r.sub_event_id && levelSubEventIds.has(r.sub_event_id));
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
  }, [registrations, search, filterSubEvent, filterLevelId, allData]);

  const sendNotification = async (registrationId: string, status: string) => {
    try {
      const { data: comp } = await supabase
        .from("competitions")
        .select("name")
        .eq("id", competitionId)
        .single();

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

  /** Reassign a single contestant to a different sub-event */
  const handleReassign = async (regId: string, newSubEventId: string | null) => {
    const { error } = await supabase
      .from("contestant_registrations")
      .update({ sub_event_id: newSubEventId } as any)
      .eq("id", regId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contestant reassigned" });
      qc.invalidateQueries({ queryKey: ["registrations", competitionId] });
    }
  };

  /** Bulk advance selected contestants */
  const handleBulkAdvance = async () => {
    if (!advanceSubEventId || selectedIds.size === 0) return;
    setIsAdvancing(true);
    try {
      const ids = Array.from(selectedIds);

      // Get current assignments before advancing
      const { data: currentRegs } = await supabase
        .from("contestant_registrations")
        .select("id, sub_event_id")
        .in("id", ids);

      const { error } = await supabase
        .from("contestant_registrations")
        .update({ sub_event_id: advanceSubEventId } as any)
        .in("id", ids);
      if (error) throw error;

      // Create advancement records
      if (currentRegs && user) {
        for (const reg of currentRegs) {
          if (reg.sub_event_id !== advanceSubEventId) { // Only log if changed
            await createAdvancement.mutateAsync({
              registration_id: reg.id,
              from_sub_event_id: reg.sub_event_id,
              to_sub_event_id: advanceSubEventId,
              advanced_by: user.id
            });
          }
        }
      }

      toast({
        title: "Contestants advanced!",
        description: `${ids.length} contestant${ids.length !== 1 ? "s" : ""} moved to ${subEventMap.get(advanceSubEventId)?.name || "selected sub-event"}.`,
      });
      setSelectedIds(new Set());
      setShowAdvanceDialog(false);
      setAdvanceLevelId("");
      setAdvanceSubEventId("");
      qc.invalidateQueries({ queryKey: ["registrations", competitionId] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleWalkInAdd = async (builtinData: Record<string, any>, customData: Record<string, any>) => {
    // When form uses custom field IDs (not builtin), values may be in customData
    // Merge all values and search by key pattern / field type hints
    const allValues = { ...customData, ...builtinData };
    const findVal = (builtinKeys: string[], hints: string[]) => {
      for (const k of builtinKeys) if (builtinData[k]) return builtinData[k];
      for (const hint of hints) {
        for (const [k, v] of Object.entries(allValues)) {
          if (v && k.toLowerCase().includes(hint)) return v;
        }
      }
      return undefined;
    };
    const resolvedEmail = findVal(["email"], ["email"]);
    const resolvedName = findVal(["full_name", "fullName"], ["name", "applicant"]);
    const resolvedPhone = findVal(["phone"], ["phone"]);
    const resolvedLocation = findVal(["location"], ["location", "city", "address"]);
    const resolvedAge = findVal(["age_category", "ageCategory"], ["age"]) || "adult";
    const resolvedBio = findVal(["bio"], ["bio"]);
    const resolvedVideo = findVal(["performance_video_url", "videoUrl"], ["video"]);
    const resolvedGuardianName = findVal(["guardian_name"], ["guardian_name", "guardian"]);
    const resolvedGuardianEmail = findVal(["guardian_email"], ["guardian_email"]);
    const resolvedGuardianPhone = findVal(["guardian_phone"], ["guardian_phone"]);
    const resolvedSignature = findVal(["__contestant_signature", "contestant_signature"], ["signature"]);
    const resolvedRulesAck = findVal(["__rules_acknowledgment", "rules_acknowledged"], ["rules", "consent"]);
    let resolvedSubEvent = builtinData.__subevent_selector || builtinData.selectedSubEventId || allValues.__subevent_selector || allValues.selectedSubEventId;

    if (!resolvedEmail || !user) return;

    // If no direct sub_event selected, resolve from deepest category
    if (!resolvedSubEvent) {
      const deepestCatId = allValues.__deepest_category_id || allValues.__subcategory_selector || allValues.selectedSubCategoryId || allValues.__category_selector || allValues.selectedCategoryId;
      if (deepestCatId) {
        const { data: cat } = await supabase
          .from("competition_categories")
          .select("sub_event_id")
          .eq("id", deepestCatId)
          .maybeSingle();
        if (cat?.sub_event_id) resolvedSubEvent = cat.sub_event_id;
      }
    }
    try {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", resolvedEmail)
        .maybeSingle();

      const userId = existingProfile?.user_id || user.id;

      // Calculate sort_order based on options
      let sortOrder = 0;
      const targetSubEvent = walkInSubEvent || undefined;
      if (walkInPosition && parseInt(walkInPosition, 10) > 0) {
        sortOrder = parseInt(walkInPosition, 10);
        const toShift = registrations?.filter(r =>
          (targetSubEvent ? r.sub_event_id === targetSubEvent : true) &&
          ((r as any).sort_order || 0) >= sortOrder
        ) || [];
        for (const r of toShift) {
          await supabase.from("contestant_registrations").update({ sort_order: ((r as any).sort_order || 0) + 1 } as any).eq("id", r.id);
        }
      } else if (walkInAfterLastTimed && targetSubEvent) {
        const { data: durs } = await supabase.from("performance_durations").select("contestant_registration_id").eq("sub_event_id", targetSubEvent);
        const timedIds = new Set(durs?.map(d => d.contestant_registration_id) || []);
        const subRegs = registrations?.filter(r => r.sub_event_id === targetSubEvent).sort((a, b) => ((a as any).sort_order || 0) - ((b as any).sort_order || 0)) || [];
        let lastTimedOrder = 0;
        subRegs.forEach(r => { if (timedIds.has(r.id)) lastTimedOrder = (r as any).sort_order || 0; });
        sortOrder = lastTimedOrder + 1;
        const toShift = subRegs.filter(r => ((r as any).sort_order || 0) >= sortOrder);
        for (const r of toShift) {
          await supabase.from("contestant_registrations").update({ sort_order: ((r as any).sort_order || 0) + 1 } as any).eq("id", r.id);
        }
      } else {
        const maxOrder = registrations?.reduce((max, r) => Math.max(max, (r as any).sort_order || 0), 0) || 0;
        sortOrder = maxOrder + 1;
      }

      await createReg.mutateAsync({
        user_id: userId,
        competition_id: competitionId,
        full_name: resolvedName || "",
        email: resolvedEmail,
        phone: resolvedPhone,
        location: resolvedLocation,
        age_category: resolvedAge,
        bio: resolvedBio,
        performance_video_url: resolvedVideo,
        guardian_name: resolvedGuardianName,
        guardian_email: resolvedGuardianEmail,
        guardian_phone: resolvedGuardianPhone,
        sub_event_id: resolvedSubEvent,
        rules_acknowledged: !!resolvedRulesAck,
        rules_acknowledged_at: resolvedRulesAck ? new Date().toISOString() : undefined,
        contestant_signature: resolvedSignature,
        contestant_signed_at: resolvedSignature ? new Date().toISOString() : undefined,
        guardian_signature: builtinData.__guardian_signature,
        guardian_signed_at: builtinData.__guardian_signature ? new Date().toISOString() : undefined,
        status: "approved",
        sort_order: sortOrder,
        custom_field_values: allValues,
      } as any);
      setShowWalkIn(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(r => r.id)));
    }
  };

  if (isLoading) return <div className="text-muted-foreground text-sm animate-pulse">Loading registrations…</div>;

  const pendingCount = registrations?.filter(r => r.status === "pending").length || 0;
  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0;

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
            <div className="flex gap-2">
              {someSelected && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    setAdvanceLevelId("");
                    setAdvanceSubEventId("");
                    setShowAdvanceDialog(true);
                  }}
                  className="gap-1"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Advance Selected ({selectedIds.size})
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setShowBulkUpload(true)}>
                <Upload className="h-3.5 w-3.5 mr-1" /> Bulk Upload
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAIUpload(true)}>
                <SparklesIcon className="h-3.5 w-3.5 mr-1" /> Upload with AI
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowWalkIn(true)}>
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Registration
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={filterLevelId} onValueChange={(v) => { setFilterLevelId(v); setFilterSubEvent("all"); }}>
              <SelectTrigger className="h-9 w-full sm:w-[180px] text-sm">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {allData?.levels.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSubEvent} onValueChange={setFilterSubEvent}>
              <SelectTrigger className="h-9 w-full sm:w-[200px] text-sm">
                <SelectValue placeholder="All Sub-Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sub-Events</SelectItem>
                <SelectItem value="unassigned">⚠ Unassigned</SelectItem>
                {filterSubEvents.map(se => (
                  <SelectItem key={se.id} value={se.id}>
                    {filterLevelId === "all" ? `${subEventMap.get(se.id)?.levelName} › ` : ""}{se.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[40px]">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="text-xs w-[40px]">#</TableHead>
                  <TableHead className="text-xs">ID</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Email</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Order</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                      No registrations found.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((reg, idx) => {
                  const currentSe = reg.sub_event_id ? subEventMap.get(reg.sub_event_id) : null;
                  return (
                    <TableRow key={reg.id} className={selectedIds.has(reg.id) ? "bg-primary/5" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(reg.id)}
                          onCheckedChange={() => toggleSelect(reg.id)}
                          aria-label={`Select ${reg.full_name}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="text-sm font-medium">{reg.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono hidden md:table-cell">{reg.email}</TableCell>
                      <TableCell>
                        <Select
                          value={reg.sub_event_id || "none"}
                          onValueChange={(v) => handleReassign(reg.id, v === "none" ? null : v)}
                        >
                          <SelectTrigger className="h-7 text-[11px] w-[160px] border-dashed">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <span className="text-muted-foreground italic">Unassigned</span>
                            </SelectItem>
                            {allData?.levels.map(level => {
                              const levelSubs = allData.subEvents.filter(se => se.level_id === level.id);
                              if (levelSubs.length === 0) return null;
                              return (
                                <div key={level.id}>
                                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    {level.name}
                                  </div>
                                  {levelSubs.map(se => (
                                    <SelectItem key={se.id} value={se.id} className="pl-4">
                                      {se.name}
                                    </SelectItem>
                                  ))}
                                </div>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${statusColor[reg.status] || ""}`}>
                          {reg.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={idx === 0}
                            onClick={() => handleMoveOrder(reg.id, "up")}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={idx === filtered.length - 1}
                            onClick={() => handleMoveOrder(reg.id, "down")}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {reg.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-secondary hover:text-secondary"
                                onClick={() => handleApprove(reg.id)}
                                title="Approve"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleReject(reg.id)}
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
                              onClick={() => handleApprove(reg.id)}
                            >
                              Re-approve
                            </Button>
                          )}
                          {reg.status === "approved" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive"
                              onClick={() => handleReject(reg.id)}
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Advance Dialog */}
      <Dialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              Advance Contestants
            </DialogTitle>
            <DialogDescription>
              Move {selectedIds.size} selected contestant{selectedIds.size !== 1 ? "s" : ""} to a new sub-event (e.g. Prelims → Semifinals).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Show selected names */}
            <div className="max-h-32 overflow-y-auto rounded-md border border-border/50 p-2 space-y-1">
              {filtered
                .filter(r => selectedIds.has(r.id))
                .map(r => (
                  <div key={r.id} className="flex items-center gap-2 text-sm">
                    <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{r.full_name}</span>
                    {r.sub_event_id && subEventMap.get(r.sub_event_id) && (
                      <Badge variant="outline" className="text-[10px] ml-auto shrink-0">
                        {subEventMap.get(r.sub_event_id)!.levelName} › {subEventMap.get(r.sub_event_id)!.name}
                      </Badge>
                    )}
                    {!r.sub_event_id && (
                      <Badge variant="outline" className="text-[10px] ml-auto shrink-0 text-muted-foreground italic">
                        Unassigned
                      </Badge>
                    )}
                  </div>
                ))}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex-1 border-t border-border/50" />
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium">Advance to</span>
              <ChevronRight className="h-4 w-4" />
              <div className="flex-1 border-t border-border/50" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Target Level</label>
                <Select value={advanceLevelId} onValueChange={(v) => { setAdvanceLevelId(v); setAdvanceSubEventId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    {allData?.levels.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Target Sub-Event</label>
                <Select value={advanceSubEventId} onValueChange={setAdvanceSubEventId} disabled={!advanceLevelId}>
                  <SelectTrigger><SelectValue placeholder="Select sub-event" /></SelectTrigger>
                  <SelectContent>
                    {advanceSubEvents.map(se => (
                      <SelectItem key={se.id} value={se.id}>{se.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleBulkAdvance}
              disabled={!advanceSubEventId || isAdvancing}
              className="w-full"
            >
              <ArrowRight className="h-4 w-4 mr-1" />
              {isAdvancing
                ? "Advancing…"
                : `Advance ${selectedIds.size} Contestant${selectedIds.size !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Walk-in / Add Contestant Dialog — Full Registration Form */}
      <Dialog open={showWalkIn} onOpenChange={setShowWalkIn}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col pt-6 pb-2 px-2 sm:px-6 overflow-hidden">
          <DialogHeader className="mb-2 px-4 sm:px-0 flex-shrink-0">
            <DialogTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add Registration
            </DialogTitle>
            <DialogDescription>
              Complete the dynamically configured form for this competition.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-0">
            <DynamicRegistrationForm
              formSchema={formSchema}
              competitionId={competitionId}
              mode="walkin"
              onSubmit={handleWalkInAdd}
              isSubmitting={createReg.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      <BulkUploadDialog competitionId={competitionId} open={showBulkUpload} onOpenChange={setShowBulkUpload} />
      <AIUploadDialog competitionId={competitionId} open={showAIUpload} onOpenChange={setShowAIUpload} />
    </div>
  );
}
