import { useState, useEffect, useMemo } from "react";
import { useLevels, useCreateLevel, useDeleteLevel, useSubEvents, useCreateSubEvent, useDeleteSubEvent } from "@/hooks/useCompetitions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ChevronDown, MapPin, Clock, Vote, CalendarDays, Pencil, Trophy, Star, Award, ArrowUp, GripVertical, ChevronLeft, ChevronRight, Crown, FolderTree, List, Copy } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays, parseISO } from "date-fns";
import { BannerUpload } from "@/components/shared/BannerUpload";
import { CategoriesPanel } from "@/components/competition/CategoriesPanel";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
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

const SPECIAL_ENTRY_PRESETS = [
  { type: "previous_winner", label: "Previous Winners", icon: Trophy },
  { type: "wild_card", label: "Wild Cards", icon: Star },
  { type: "sub_competition_winner", label: "Sub-Competition Winners", icon: Award },
] as const;

type SpecialEntry = { type: string; label: string };

function LevelAdvancementSettings({ level, competitionId }: { level: any; competitionId: string }) {
  const qc = useQueryClient();
  const [advCount, setAdvCount] = useState<string>((level as any).advancement_count?.toString() || "");
  const [isFinalRound, setIsFinalRound] = useState<boolean>((level as any).is_final_round || false);
  const specialEntries: SpecialEntry[] = (level as any).special_entries || [];

  const saveAdvancement = async (val: string) => {
    const num = val ? parseInt(val, 10) : null;
    await supabase.from("competition_levels").update({ advancement_count: num } as any).eq("id", level.id);
    qc.invalidateQueries({ queryKey: ["levels", competitionId] });
  };

  const toggleFinalRound = async (checked: boolean) => {
    setIsFinalRound(checked);
    await supabase.from("competition_levels").update({ is_final_round: checked } as any).eq("id", level.id);
    qc.invalidateQueries({ queryKey: ["levels", competitionId] });
  };

  const toggleSpecialEntry = async (preset: typeof SPECIAL_ENTRY_PRESETS[number]) => {
    const exists = specialEntries.some((e) => e.type === preset.type);
    const updated = exists
      ? specialEntries.filter((e) => e.type !== preset.type)
      : [...specialEntries, { type: preset.type, label: preset.label }];
    await supabase.from("competition_levels").update({ special_entries: updated } as any).eq("id", level.id);
    qc.invalidateQueries({ queryKey: ["levels", competitionId] });
  };

  return (
    <div className="space-y-3 py-2">
      {/* Final Round Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
        <div className="space-y-0.5">
          <Label htmlFor={`final-round-${level.id}`} className="text-sm font-medium flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5 text-amber-500" /> Final Round
          </Label>
          <p className="text-xs text-muted-foreground">
            Champion placements (1st, 2nd, 3rd) will be shown on the master sheet
          </p>
        </div>
        <Switch id={`final-round-${level.id}`} checked={isFinalRound} onCheckedChange={toggleFinalRound} />
      </div>

      {!isFinalRound && (
        <div>
          <Label className="text-xs text-muted-foreground">Contestants advancing to next level</Label>
          <Input
            type="number"
            min={0}
            placeholder="e.g. 10"
            className="h-8 mt-1 w-40"
            value={advCount}
            onChange={(e) => setAdvCount(e.target.value)}
            onBlur={() => saveAdvancement(advCount)}
          />
        </div>
      )}
      <div>
        <Label className="text-xs text-muted-foreground">Special Entries in this Level</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {SPECIAL_ENTRY_PRESETS.map((preset) => {
            const active = specialEntries.some((e) => e.type === preset.type);
            const Icon = preset.icon;
            return (
              <button
                key={preset.type}
                type="button"
                onClick={() => toggleSpecialEntry(preset)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                <Icon className="h-3 w-3" />
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getSubEventStatus(e: any): { type: "in-progress" | "countdown" | "completed" | "none"; label?: string } {
  if (!e.event_date) return { type: "none" };
  const now = new Date();
  const dateStr = e.event_date; // "YYYY-MM-DD"

  if (e.end_time) {
    const endDt = new Date(`${dateStr}T${e.end_time}`);
    if (now > endDt) return { type: "completed" };
  }

  if (e.start_time) {
    const startDt = new Date(`${dateStr}T${e.start_time}`);
    const endDt = e.end_time ? new Date(`${dateStr}T${e.end_time}`) : null;
    if (now >= startDt && (!endDt || now <= endDt)) return { type: "in-progress" };
    if (now < startDt) {
      const days = differenceInDays(startDt, now);
      const hours = differenceInHours(startDt, now) % 24;
      const mins = differenceInMinutes(startDt, now) % 60;
      let label = "Starts in ";
      if (days > 0) label += `${days}d `;
      if (hours > 0) label += `${hours}h `;
      if (days === 0 && mins > 0) label += `${mins}m`;
      return { type: "countdown", label: label.trim() };
    }
  } else {
    // Date only, no time
    const eventDay = parseISO(dateStr);
    const today = new Date(); today.setHours(0,0,0,0);
    eventDay.setHours(0,0,0,0);
    if (eventDay.getTime() === today.getTime()) return { type: "in-progress" };
    if (eventDay > today) {
      const days = differenceInDays(eventDay, today);
      return { type: "countdown", label: `Starts in ${days}d` };
    }
    return { type: "completed" };
  }
  return { type: "none" };
}

function SubEventsPanel({ levelId }: { levelId: string }) {
  const { data: events } = useSubEvents(levelId);
  const create = useCreateSubEvent();
  const remove = useDeleteSubEvent();
  const qc = useQueryClient();
  const [, setTick] = useState(0);

  // Refresh countdown every 60s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [votingEnabled, setVotingEnabled] = useState(false);
  const [useTimeSlots, setUseTimeSlots] = useState(true);
  const [ticketingType, setTicketingType] = useState("free");
  const [ticketPrice, setTicketPrice] = useState("");
  const [maxTickets, setMaxTickets] = useState("");
  const [externalTicketUrl, setExternalTicketUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName(""); setLocation(""); setEventDate(""); setStartTime(""); setEndTime(""); setVotingEnabled(false);
    setUseTimeSlots(true); setTicketingType("free"); setTicketPrice(""); setMaxTickets(""); setExternalTicketUrl(""); setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (e: any) => {
    setEditingId(e.id);
    setName(e.name);
    setLocation(e.location || "");
    setEventDate(e.event_date || "");
    setStartTime(e.start_time || "");
    setEndTime(e.end_time || "");
    setVotingEnabled(e.voting_enabled || false);
    setUseTimeSlots(e.use_time_slots !== false);
    setTicketingType(e.ticketing_type || "free");
    setTicketPrice(e.ticket_price?.toString() || "");
    setMaxTickets(e.max_tickets?.toString() || "");
    setExternalTicketUrl(e.external_ticket_url || "");
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (editingId) {
      setSaving(true);
      await supabase.from("sub_events").update({
        name, location: location || null, event_date: eventDate || null,
        start_time: startTime || null, end_time: endTime || null, voting_enabled: votingEnabled,
        use_time_slots: useTimeSlots,
        ticketing_type: ticketingType,
        ticket_price: ticketingType === "paid" ? parseFloat(ticketPrice) || 0 : 0,
        max_tickets: (ticketingType === "free" || ticketingType === "paid") && maxTickets ? parseInt(maxTickets, 10) : null,
        external_ticket_url: ticketingType === "external" ? externalTicketUrl || null : null,
      } as any).eq("id", editingId);
      qc.invalidateQueries({ queryKey: ["sub_events", levelId] });
      setSaving(false);
      resetForm();
      setModalOpen(false);
    } else {
      create.mutate(
        {
          level_id: levelId, name, location: location || undefined, event_date: eventDate || undefined,
          start_time: startTime || undefined, end_time: endTime || undefined, voting_enabled: votingEnabled,
          use_time_slots: useTimeSlots,
          ticketing_type: ticketingType,
          ticket_price: ticketingType === "paid" ? parseFloat(ticketPrice) || 0 : 0,
          max_tickets: (ticketingType === "free" || ticketingType === "paid") && maxTickets ? parseInt(maxTickets, 10) : undefined,
          external_ticket_url: ticketingType === "external" ? externalTicketUrl || undefined : undefined,
        } as any,
        { onSuccess: () => { resetForm(); setModalOpen(false); } }
      );
    }
  };

  const updateBanner = async (id: string, url: string | null) => {
    await supabase.from("sub_events").update({ banner_url: url } as any).eq("id", id);
    qc.invalidateQueries({ queryKey: ["sub_events", levelId] });
  };

  return (
    <div className="pl-4 border-l border-border/50 space-y-3 mt-3">
      <Button size="sm" variant="outline" onClick={openCreate} className="w-full h-8 text-xs">
        <Plus className="h-3 w-3 mr-1" /> Add Sub-Event
      </Button>

      {events?.map((e) => {
        const status = getSubEventStatus(e);
        return (
          <div key={e.id} className="bg-muted/50 rounded-md px-3 py-2 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="flex items-center gap-2 flex-wrap text-left hover:opacity-70 transition-opacity cursor-pointer"
                onClick={() => openEdit(e)}
              >
                <span className="font-medium text-foreground">{e.name}</span>
                {e.location && <span className="text-muted-foreground text-xs"><MapPin className="h-3 w-3 inline" /> {e.location}</span>}
                {e.event_date && <span className="text-muted-foreground text-xs"><Clock className="h-3 w-3 inline" /> {e.event_date}</span>}
                {(e as any).voting_enabled && <span className="text-xs text-primary"><Vote className="h-3 w-3 inline" /> People's Choice</span>}
                {(e as any).use_time_slots === false && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Performance Order</Badge>
                )}
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-2 shrink-0">
                {status.type === "in-progress" && (
                  <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 animate-pulse">● In Progress</Badge>
                )}
                {status.type === "countdown" && (
                  <Badge variant="secondary" className="text-[10px] px-1.5">{status.label}</Badge>
                )}
                {status.type === "completed" && (
                  <Badge variant="outline" className="text-[10px] px-1.5 text-muted-foreground">Completed</Badge>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate({ id: e.id, level_id: levelId })}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <BannerUpload
              currentUrl={(e as any).banner_url}
              folder={`sub-events/${e.id}`}
              aspectLabel="Sub-Event Banner"
              onUploaded={(url) => updateBanner(e.id, url)}
              onRemoved={() => updateBanner(e.id, null)}
            />
          </div>
        );
      })}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Sub-Event" : "Add Sub-Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Event Name *</Label>
              <Input placeholder="e.g. Semi-Finals Night" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Input placeholder="Venue or room" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Start Time</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">End Time</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="voting-toggle" className="text-sm font-medium">People's Choice Voting</Label>
                <p className="text-xs text-muted-foreground">Enable audience voting for this sub-event</p>
              </div>
              <Switch id="voting-toggle" checked={votingEnabled} onCheckedChange={setVotingEnabled} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="timeslots-toggle" className="text-sm font-medium">Use Time Slots</Label>
                <p className="text-xs text-muted-foreground">
                  {useTimeSlots
                    ? "Contestants are scheduled by time slots"
                    : "Contestants follow a manual order of performance"}
                </p>
              </div>
              <Switch id="timeslots-toggle" checked={useTimeSlots} onCheckedChange={setUseTimeSlots} />
            </div>

            {/* Ticketing */}
            <div className="space-y-2 rounded-lg border border-border/50 p-3">
              <Label className="text-sm font-medium">Ticketing</Label>
              <div className="flex gap-2">
                {(["free", "paid", "external"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTicketingType(t)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      ticketingType === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {t === "free" ? "Free" : t === "paid" ? "Paid" : "External"}
                  </button>
                ))}
              </div>
              {ticketingType === "paid" && (
                <div>
                  <Label className="text-xs">Ticket Price ($)</Label>
                  <Input type="number" min="0" step="0.01" placeholder="e.g. 25.00" value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)} />
                </div>
              )}
              {(ticketingType === "free" || ticketingType === "paid") && (
                <div>
                  <Label className="text-xs">Max Tickets (optional)</Label>
                  <Input type="number" min="0" placeholder="Unlimited" value={maxTickets} onChange={(e) => setMaxTickets(e.target.value)} />
                </div>
              )}
              {ticketingType === "external" && (
                <div>
                  <Label className="text-xs">External Ticket URL</Label>
                  <Input type="url" placeholder="https://eventbrite.com/…" value={externalTicketUrl} onChange={(e) => setExternalTicketUrl(e.target.value)} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setModalOpen(false); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={(create.isPending || saving) || !name.trim()}>
              {saving ? "Saving…" : create.isPending ? "Adding…" : editingId ? "Save Changes" : "Add Sub-Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function LevelsManager({ competitionId }: { competitionId: string }) {
  const { data: levels } = useLevels(competitionId);
  const create = useCreateLevel();
  const remove = useDeleteLevel();
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [levelsPage, setLevelsPage] = useState(1);
  const levelsPageSize = 10;

  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [newLevelId, setNewLevelId] = useState<string | null>(null);
  const [sourceLevelForCopy, setSourceLevelForCopy] = useState<any>(null);
  const [copying, setCopying] = useState(false);

  const handleAdd = () => {
    if (!newName.trim()) return;
    create.mutate(
      { competition_id: competitionId, name: newName, sort_order: (levels?.length || 0) },
      {
        onSuccess: async (newLevel: any) => {
          setNewName("");
          // Check if any previous level uses categories
          if (levels && levels.length > 0) {
            // Scan backwards to find the most recent level with categories
            for (let i = levels.length - 1; i >= 0; i--) {
              const prevLevel = levels[i];
              if ((prevLevel as any).structure_type === "categories") {
                const { data: cats } = await supabase
                  .from("competition_categories")
                  .select("id")
                  .eq("level_id", prevLevel.id)
                  .limit(1);
                if (cats && cats.length > 0) {
                  setSourceLevelForCopy(prevLevel);
                  setNewLevelId(newLevel.id);
                  setCopyDialogOpen(true);
                  break;
                }
              }
            }
          }
        },
      }
    );
  };

  const handleCopyCategories = async () => {
    if (!sourceLevelForCopy || !newLevelId) return;
    setCopying(true);
    try {
      // Fetch all categories from source level
      const { data: sourceCats, error } = await supabase
        .from("competition_categories")
        .select("*")
        .eq("level_id", sourceLevelForCopy.id)
        .order("sort_order");
      if (error) throw error;
      if (!sourceCats?.length) return;

      // Set new level structure_type to categories
      await supabase.from("competition_levels").update({ structure_type: "categories" } as any).eq("id", newLevelId);

      // Map old IDs to new IDs for parent references
      const idMap = new Map<string, string>();
      // Process in order so parents are created before children
      // Sort by depth (categories with no parent first, then children)
      const sorted = [...sourceCats].sort((a, b) => {
        const depthA = a.parent_id ? 1 : 0;
        const depthB = b.parent_id ? 1 : 0;
        return depthA - depthB;
      });
      // Multi-pass to handle deep nesting
      const remaining = [...sorted];
      let maxPasses = 10;
      while (remaining.length > 0 && maxPasses-- > 0) {
        const stillRemaining: typeof remaining = [];
        for (const cat of remaining) {
          const newParentId = cat.parent_id ? idMap.get(cat.parent_id) || null : null;
          if (cat.parent_id && !newParentId) {
            stillRemaining.push(cat);
            continue;
          }
          const { data: newCat, error: insertErr } = await supabase
            .from("competition_categories")
            .insert({
              level_id: newLevelId,
              parent_id: newParentId,
              name: cat.name,
              color: cat.color,
              sort_order: cat.sort_order,
            })
            .select()
            .single();
          if (insertErr) throw insertErr;
          idMap.set(cat.id, newCat.id);
        }
        remaining.length = 0;
        remaining.push(...stillRemaining);
      }

      qc.invalidateQueries({ queryKey: ["levels", competitionId] });
      qc.invalidateQueries({ queryKey: ["competition_categories", newLevelId] });
      toast({ title: "Categories copied", description: `${idMap.size} categories copied to the new level.` });
    } catch (e: any) {
      toast({ title: "Error copying categories", description: e.message, variant: "destructive" });
    } finally {
      setCopying(false);
      setCopyDialogOpen(false);
      setNewLevelId(null);
      setSourceLevelForCopy(null);
    }
  };

  const updateLevelBanner = async (id: string, url: string | null) => {
    await supabase.from("competition_levels").update({ banner_url: url } as any).eq("id", id);
    qc.invalidateQueries({ queryKey: ["levels", competitionId] });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !levels) return;

    const oldIndex = levels.findIndex((l) => l.id === active.id);
    const newIndex = levels.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder and persist
    const reordered = [...levels];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Optimistically update cache
    qc.setQueryData(["levels", competitionId], reordered);

    // Persist all sort_order values
    await Promise.all(
      reordered.map((l, i) =>
        supabase.from("competition_levels").update({ sort_order: i } as any).eq("id", l.id)
      )
    );
    qc.invalidateQueries({ queryKey: ["levels", competitionId] });
  };

  return (
    <>
    <Card className="border-border/50 bg-card/80">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-secondary" />
          <CardTitle className="text-base">Levels & Sub-Events</CardTitle>
        </div>
        <CardDescription>Organize your competition into levels (e.g. Auditions, Finals) and add sub-events with schedules. Drag to reorder.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="New level name (e.g. Auditions)" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-9" />
          <Button size="sm" onClick={handleAdd} disabled={create.isPending || !newName.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
          <SortableContext items={levels?.map((l) => l.id) || []} strategy={verticalListSortingStrategy}>
            {(() => {
              const totalLevels = levels?.length || 0;
              const totalLevelsPages = Math.max(1, Math.ceil(totalLevels / levelsPageSize));
              const safeLP = Math.min(levelsPage, totalLevelsPages);
              const pagedLevels = levels?.slice((safeLP - 1) * levelsPageSize, safeLP * levelsPageSize) || [];
              return (
                <>
                  {pagedLevels.map((l, idx) => (
                    <SortableLevelItem
                      key={l.id}
                      level={l}
                      index={(safeLP - 1) * levelsPageSize + idx}
                      competitionId={competitionId}
                      onDelete={() => remove.mutate({ id: l.id, competition_id: competitionId })}
                      onUpdateBanner={(url) => updateLevelBanner(l.id, url)}
                    />
                  ))}
                  {totalLevelsPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-muted-foreground">
                        Showing {(safeLP - 1) * levelsPageSize + 1}–{Math.min(safeLP * levelsPageSize, totalLevels)} of {totalLevels}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" disabled={safeLP <= 1} onClick={() => setLevelsPage(safeLP - 1)}>
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs text-muted-foreground px-2">{safeLP} / {totalLevelsPages}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" disabled={safeLP >= totalLevelsPages} onClick={() => setLevelsPage(safeLP + 1)}>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>

    <AlertDialog open={copyDialogOpen} onOpenChange={(open) => {
      if (!open) {
        setCopyDialogOpen(false);
        setNewLevelId(null);
        setSourceLevelForCopy(null);
      }
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Copy className="h-4 w-4" /> Copy Categories from Previous Level?
          </AlertDialogTitle>
          <AlertDialogDescription>
            The previous level <strong>"{sourceLevelForCopy?.name}"</strong> uses a category structure.
            Would you like to copy its categories into the new level? This will replicate the full category tree
            so you don't have to set it up again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={copying}>No, start fresh</AlertDialogCancel>
          <AlertDialogAction onClick={handleCopyCategories} disabled={copying}>
            {copying ? "Copying…" : "Yes, copy categories"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function StructureToggle({ level, competitionId }: { level: any; competitionId: string }) {
  const qc = useQueryClient();
  const structureType: string = level.structure_type || "sub_events";

  const handleToggle = async (newType: string) => {
    await supabase.from("competition_levels").update({ structure_type: newType } as any).eq("id", level.id);
    qc.invalidateQueries({ queryKey: ["levels", competitionId] });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs text-muted-foreground">Structure:</span>
        <div className="flex gap-1">
          {([
            { value: "sub_events", label: "Sub-Events", icon: List },
            { value: "categories", label: "Categories", icon: FolderTree },
          ] as const).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleToggle(value)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                structureType === value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </div>
      {structureType === "sub_events" ? (
        <SubEventsPanel levelId={level.id} />
      ) : (
        <CategoriesPanel levelId={level.id} />
      )}
    </div>
  );
}

function SortableLevelItem({ level: l, index, competitionId, onDelete, onUpdateBanner }: {
  level: any;
  index: number;
  competitionId: string;
  onDelete: () => void;
  onUpdateBanner: (url: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: l.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const advCount = l.advancement_count;
  const specials: SpecialEntry[] = l.special_entries || [];
  const isFinal = l.is_final_round || false;

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible>
        <div className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground shrink-0">
              <GripVertical className="h-4 w-4" />
            </button>
            <span className="text-xs font-mono text-muted-foreground shrink-0">{index + 1}</span>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground flex-wrap">
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
              {l.name}
              {isFinal && (
                <Badge className="bg-amber-500 text-white text-[10px] gap-1 px-1.5 py-0">
                  <Crown className="h-2.5 w-2.5" /> Final Round
                </Badge>
              )}
              {!isFinal && advCount != null && advCount > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                  <ArrowUp className="h-2.5 w-2.5" /> Top {advCount} advance
                </Badge>
              )}
              {specials.map((s) => (
                <Badge key={s.type} variant="outline" className="text-[10px] px-1.5 py-0">
                  {s.label}
                </Badge>
              ))}
            </CollapsibleTrigger>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        <CollapsibleContent>
          <div className="pl-4 mt-2 space-y-2">
            <BannerUpload
              currentUrl={l.banner_url}
              folder={`levels/${l.id}`}
              aspectLabel="Level Banner"
              onUploaded={(url) => onUpdateBanner(url)}
              onRemoved={() => onUpdateBanner(null)}
            />
            <LevelAdvancementSettings level={l} competitionId={competitionId} />
          </div>
          <StructureToggle level={l} competitionId={competitionId} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
