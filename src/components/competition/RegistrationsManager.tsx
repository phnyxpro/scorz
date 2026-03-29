import { useState, useMemo } from "react";
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
import { CheckCircle, XCircle, ArrowUp, ArrowDown, UserPlus, Search, ArrowRight, ArrowLeft, Users, ChevronRight, User, Info, Calendar, PenTool, Link as LinkIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/registration/SignaturePad";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useRegistrationFormConfig, createDefaultFormSchema, useCreateAdvancement } from "@/hooks/useRegistrationForm";
import { DynamicRegistrationForm } from "@/components/registration/DynamicRegistrationForm";

const statusColor: Record<string, string> = {
  approved: "bg-secondary/20 text-secondary border-secondary/30",
  pending: "bg-primary/20 text-primary border-primary/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
};

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
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
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
    // Sort by sort_order, then by name
    list.sort((a, b) => ((a as any).sort_order || 0) - ((b as any).sort_order || 0));
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

  const handleMoveOrder = async (id: string, direction: "up" | "down") => {
    const idx = filtered.findIndex(r => r.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= filtered.length) return;

    const currentOrder = (filtered[idx] as any).sort_order || 0;
    const swapOrder = (filtered[swapIdx] as any).sort_order || 0;

    await supabase.from("contestant_registrations").update({ sort_order: swapOrder } as any).eq("id", filtered[idx].id);
    await supabase.from("contestant_registrations").update({ sort_order: currentOrder } as any).eq("id", filtered[swapIdx].id);
    qc.invalidateQueries({ queryKey: ["registrations", competitionId] });
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
    if (!builtinData.email || !user) return;
    try {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", builtinData.email)
        .maybeSingle();

      const userId = existingProfile?.user_id || user.id;

      await createReg.mutateAsync({
        user_id: userId,
        competition_id: competitionId,
        full_name: builtinData.full_name || builtinData.fullName || "",
        email: builtinData.email,
        phone: builtinData.phone,
        location: builtinData.location,
        age_category: builtinData.age_category || builtinData.ageCategory || "adult",
        bio: builtinData.bio,
        performance_video_url: builtinData.performance_video_url || builtinData.videoUrl,
        guardian_name: builtinData.guardian_name,
        guardian_email: builtinData.guardian_email,
        guardian_phone: builtinData.guardian_phone,
        sub_event_id: builtinData.__subevent_selector || builtinData.selectedSubEventId,
        rules_acknowledged: builtinData.__rules_acknowledgment,
        rules_acknowledged_at: builtinData.__rules_acknowledgment ? new Date().toISOString() : undefined,
        contestant_signature: builtinData.__contestant_signature,
        contestant_signed_at: builtinData.__contestant_signature ? new Date().toISOString() : undefined,
        guardian_signature: builtinData.__guardian_signature,
        guardian_signed_at: builtinData.__guardian_signature ? new Date().toISOString() : undefined,
        status: "approved",
        custom_data: customData,
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
                {registrations?.length || 0} total · {pendingCount} pending approval
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
              <Button size="sm" variant="outline" onClick={() => setShowWalkIn(true)}>
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Walk-in Add
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
                onChange={e => setSearch(e.target.value)}
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
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Email</TableHead>
                  <TableHead className="text-xs">Sub-Event</TableHead>
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
        <DialogContent className="sm:max-w-md">
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col pt-6 pb-2 px-2 sm:px-6">
          <DialogHeader className="mb-2 px-4 sm:px-0 flex-shrink-0">
            <DialogTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add Walk-in Contestant
            </DialogTitle>
            <DialogDescription>
              Complete the dynamically configured form for this competition.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 px-4 sm:px-0">
            <DynamicRegistrationForm
              formSchema={formSchema}
              competitionId={competitionId}
              mode="walkin"
              onSubmit={handleWalkInAdd}
              isSubmitting={createReg.isPending}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
