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
import { CheckCircle, XCircle, ArrowUp, ArrowDown, UserPlus, Search, ShieldAlert, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ContestantDetailSheet } from "./ContestantDetailSheet";
import { ContestantRegistration } from "@/hooks/useRegistrations";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { OnBehalfRegistrationForm } from "@/pages/ContestantRegistration";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const statusColor: Record<string, string> = {
  approved: "bg-secondary/20 text-secondary border-secondary/30",
  pending: "bg-primary/20 text-primary border-primary/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
};

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
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [showAddContestant, setShowAddContestant] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInEmail, setWalkInEmail] = useState("");
  const [walkInAge, setWalkInAge] = useState("adult");
  const [walkInConsent, setWalkInConsent] = useState(false);
  const [selectedReg, setSelectedReg] = useState<ContestantRegistration | null>(null);

  // Get all sub-events for filtering
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
    // Sort by sort_order, then by name
    list.sort((a, b) => ((a as any).sort_order || 0) - ((b as any).sort_order || 0));
    return list;
  }, [registrations, search, filterSubEvent]);

  const sendNotification = async (registrationId: string, status: string) => {
    try {
      // Get competition name for the email
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
    // time is in HH:MM:SS format, display as HH:MM AM/PM
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${h12}:${m} ${ampm}`;
  };

  const handleWalkInAdd = async () => {
    if (!walkInName || !walkInEmail || !user) return;
    // For walk-ins, the organizer creates the registration on behalf
    // We use a special approach: create with the organizer's user_id tagged
    try {
      // First check if a profile exists for this email
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
                {registrations?.length || 0} total · {pendingCount} pending approval
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowAddContestant(true)}>
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Contestant
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[40px]">#</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Age</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Order</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      No registrations found.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((reg, idx) => (
                  <TableRow key={reg.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <button
                        className="text-sm font-medium text-primary hover:underline text-left"
                        onClick={() => setSelectedReg(reg)}
                      >
                        {reg.full_name}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">{reg.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {reg.age_category}
                        </Badge>
                        {reg.age_category === "minor" && !reg.guardian_name && (
                          <Badge variant="outline" className="text-[10px] gap-0.5 border-amber-500/50 text-amber-600 dark:text-amber-400">
                            <ShieldAlert className="h-2.5 w-2.5" /> No Guardian
                          </Badge>
                        )}
                      </div>
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
                ))}
              </TableBody>
            </Table>
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
    </div>
  );
}
