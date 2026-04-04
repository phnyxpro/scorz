import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRoleName } from "@/lib/utils";
import { useLevels, useSubEvents } from "@/hooks/useCompetitions";
import {
  useStaffInvitations,
  useStaffInvitationSubEvents,
  useAddStaffMember,
  useSendStaffInvite,
  useAddStaffSubEvent,
  useRemoveStaffSubEvent,
  useDeleteInvitation,
  useUpdateStaffInvitation,
  type StaffInvitation,
  type StaffInvitationSubEvent,
} from "@/hooks/useStaffInvitations";
import { useCompetitionLimits, useCompetitionStaffCounts } from "@/hooks/useCompetitionLimits";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, X, Users, ShieldCheck, Mail, Trash2, CheckCircle, Clock, AlertTriangle, Send, MapPin, Plus, Eye, Pencil, ClipboardList, Search } from "lucide-react";

const ASSIGNABLE_ROLES = ["organizer", "judge", "tabulator"] as const;

const roleColors: Record<string, string> = {
  organizer: "bg-accent/20 text-accent-foreground",
  judge: "bg-primary/20 text-primary",
  tabulator: "bg-secondary/20 text-secondary-foreground",
};

interface Props {
  competitionId: string;
  competitionName?: string;
}

export function SubEventAssignments({ competitionId, competitionName }: Props) {
  const { hasRole, startMasquerade } = useAuth();
  const navigate = useNavigate();
  const isAdmin = hasRole("admin");
  const { data: levels } = useLevels(competitionId);
  const { data: tierLimits } = useCompetitionLimits(competitionId);
  const { data: staffCounts } = useCompetitionStaffCounts(competitionId);
  const addStaffMember = useAddStaffMember();
  const sendInvite = useSendStaffInvite();
  const addStaffSubEvent = useAddStaffSubEvent();
  const removeStaffSubEvent = useRemoveStaffSubEvent();
  const deleteInvitation = useDeleteInvitation();
  const updateInvitation = useUpdateStaffInvitation();
  const { data: invitations } = useStaffInvitations(competitionId);
  const { data: invitationSubEvents } = useStaffInvitationSubEvents(competitionId);
  const [previewInv, setPreviewInv] = useState<StaffInvitation | null>(null);
  const [editingInv, setEditingInv] = useState<StaffInvitation | null>(null);

  const handleMasquerade = async (inv: StaffInvitation) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", inv.email)
      .maybeSingle();
    if (!profile?.user_id) {
      toast({ title: "This user hasn't signed up yet — masquerade unavailable.", variant: "destructive" });
      return;
    }
    await startMasquerade({
      userId: profile.user_id,
      email: inv.email,
      fullName: inv.name || inv.email,
      competitionId,
    });
    navigate("/dashboard");
  };

  // Staff roster form
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffRole, setStaffRole] = useState<string>("judge");
  const [staffIsChief, setStaffIsChief] = useState(false);
  const [staffIsPA, setStaffIsPA] = useState(false);

  const handleAddStaff = () => {
    if (!staffEmail || !staffRole) return;
    addStaffMember.mutate({
      name: staffName || undefined,
      email: staffEmail,
      phone: staffPhone || undefined,
      role: staffRole as any,
      competitionId,
      competitionName,
      isChief: staffRole === "judge" ? staffIsChief : false,
      isProductionAssistant: staffRole === "organizer" ? staffIsPA : false,
    });
    setStaffName("");
    setStaffEmail("");
    setStaffPhone("");
    setStaffIsChief(false);
    setStaffIsPA(false);
  };

  const handleSendInvite = (inv: { id: string; email: string; role: any }) => {
    sendInvite.mutate({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      competitionId,
      competitionName,
    });
  };

  // Group invitations by status
  const uninvited = invitations?.filter(i => !i.invited_at && !i.accepted_at) || [];
  const pending = invitations?.filter(i => i.invited_at && !i.accepted_at) || [];
  const accepted = invitations?.filter(i => i.accepted_at) || [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [addTab, setAddTab] = useState<string>("new");
  const [importSearch, setImportSearch] = useState("");

  // Fetch staff from other competitions for the "From Other Events" tab
  const { data: otherStaff } = useQuery({
    queryKey: ["other_event_staff", competitionId],
    enabled: showAddModal && addTab === "existing",
    queryFn: async () => {
      // Get staff invitations from other competitions
      const { data, error } = await (supabase
        .from("staff_invitations" as any)
        .select("name, email, phone, role, competition_id")
        .neq("competition_id", competitionId)
        .order("email") as any);
      if (error) throw error;
      return (data || []) as { name: string | null; email: string; phone: string | null; role: string; competition_id: string }[];
    },
  });

  // Get competition names for display
  const otherCompIds = useMemo(() => {
    if (!otherStaff) return [];
    return [...new Set(otherStaff.map(s => s.competition_id))];
  }, [otherStaff]);

  const { data: otherCompetitions } = useQuery({
    queryKey: ["competition_names", otherCompIds],
    enabled: otherCompIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("competitions")
        .select("id, name")
        .in("id", otherCompIds);
      return (data || []) as { id: string; name: string }[];
    },
  });

  const compNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    otherCompetitions?.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [otherCompetitions]);

  // Deduplicate other staff by email+role, filter out already-invited
  const currentEmails = useMemo(() => new Set((invitations || []).map(i => i.email.toLowerCase())), [invitations]);

  const filteredOtherStaff = useMemo(() => {
    if (!otherStaff) return [];
    const seen = new Set<string>();
    const deduped = otherStaff.filter(s => {
      const key = `${s.email.toLowerCase()}_${s.role}`;
      if (seen.has(key) || currentEmails.has(s.email.toLowerCase())) return false;
      seen.add(key);
      return true;
    });
    if (!importSearch.trim()) return deduped;
    const q = importSearch.toLowerCase();
    return deduped.filter(s =>
      s.email.toLowerCase().includes(q) ||
      (s.name?.toLowerCase() || "").includes(q) ||
      (compNameMap[s.competition_id] || "").toLowerCase().includes(q)
    );
  }, [otherStaff, importSearch, currentEmails, compNameMap]);

  const handleImportStaff = (staff: { name: string | null; email: string; phone: string | null; role: string }) => {
    addStaffMember.mutate({
      name: staff.name || undefined,
      email: staff.email,
      phone: staff.phone || undefined,
      role: staff.role as any,
      competitionId,
      competitionName,
    });
  };

  return (
    <div className="space-y-4">
      {/* Top bar with Add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Staff Roster</h2>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add Staff Member
        </Button>
      </div>

      {/* Add Staff Modal */}
      <Dialog open={showAddModal} onOpenChange={(open) => { setShowAddModal(open); if (!open) { setAddTab("new"); setImportSearch(""); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Add Staff Member
            </DialogTitle>
          </DialogHeader>
          <Tabs value={addTab} onValueChange={setAddTab}>
            <TabsList className="w-full">
              <TabsTrigger value="new" className="flex-1">New</TabsTrigger>
              <TabsTrigger value="existing" className="flex-1">From Other Events</TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-3 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input type="text" placeholder="John Doe" value={staffName} onChange={(e) => setStaffName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email Address *</Label>
                  <Input type="email" placeholder="colleague@example.com" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Phone (optional)</Label>
                  <Input type="tel" placeholder="+1 234 567 8900" value={staffPhone} onChange={(e) => setStaffPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Role</Label>
                  <Select value={staffRole} onValueChange={(v) => { setStaffRole(v); if (v !== "judge") setStaffIsChief(false); if (v !== "organizer") setStaffIsPA(false); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{formatRoleName(r)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {staffRole === "judge" && (
                <div className="flex items-center gap-2">
                  <Checkbox id="chief-judge-modal" checked={staffIsChief} onCheckedChange={(v) => setStaffIsChief(v === true)} />
                  <label htmlFor="chief-judge-modal" className="text-sm cursor-pointer flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Designate as Chief Judge
                  </label>
                </div>
              )}
              {staffRole === "organizer" && (
                <div className="flex items-center gap-2">
                  <Checkbox id="pa-modal" checked={staffIsPA} onCheckedChange={(v) => setStaffIsPA(v === true)} />
                  <label htmlFor="pa-modal" className="text-sm cursor-pointer flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5 text-accent" /> Designate as Production Assistant
                  </label>
                </div>
              )}
              <p className="text-xs text-muted-foreground">An account will be created automatically and they'll receive a notification email with a magic link to sign in.</p>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => { handleAddStaff(); setShowAddModal(false); }} disabled={!staffEmail || addStaffMember.isPending}>
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="existing" className="space-y-3 mt-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or event..."
                  className="pl-8 h-9 text-sm"
                  value={importSearch}
                  onChange={(e) => setImportSearch(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[280px]">
                {filteredOtherStaff.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6">
                    {otherStaff === undefined ? "Loading staff from other events…" : "No staff found from other events."}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {filteredOtherStaff.map((s, idx) => (
                      <div key={`${s.email}-${s.role}-${idx}`} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{s.name || s.email}</p>
                          {s.name && <p className="text-xs text-muted-foreground truncate">{s.email}</p>}
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="outline" className="text-[10px] py-0 h-4 uppercase">{s.role}</Badge>
                            <span className="text-[10px] text-muted-foreground truncate">
                              {compNameMap[s.competition_id] || "Other event"}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-2 shrink-0 h-7 text-xs"
                          disabled={addStaffMember.isPending}
                          onClick={() => handleImportStaff(s)}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Email Preview Dialog */}
      <EmailPreviewDialog
        inv={previewInv}
        competitionName={competitionName}
        onClose={() => setPreviewInv(null)}
      />

      {/* Tier Limits Progress — hidden for admins (unlimited) */}
      {!isAdmin && tierLimits && staffCounts && (
        <Card className="border-border/50 bg-card/80">
          <CardContent className="pt-4 pb-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Judges</span>
                  <span className="font-mono text-foreground">
                    {staffCounts.judges} / {tierLimits.judges}
                  </span>
                </div>
                <Progress
                  value={(staffCounts.judges / tierLimits.judges) * 100}
                  className="h-1.5"
                />
                {staffCounts.judges >= tierLimits.judges && (
                  <p className="text-[10px] text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Limit reached
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Tabulators</span>
                  <span className="font-mono text-foreground">
                    {staffCounts.tabulators} / {tierLimits.tabulators}
                  </span>
                </div>
                <Progress
                  value={(staffCounts.tabulators / tierLimits.tabulators) * 100}
                  className="h-1.5"
                />
                {staffCounts.tabulators >= tierLimits.tabulators && (
                  <p className="text-[10px] text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Limit reached
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}




      {/* Staff list grouped by status */}
      {uninvited.length > 0 && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-3.5 w-3.5" /> Not Yet Invited ({uninvited.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {uninvited.map((inv) => (
                <StaffRow
                  key={inv.id}
                  inv={inv}
                  competitionId={competitionId}
                  levels={levels}
                  invitationSubEvents={invitationSubEvents?.filter(ise => ise.staff_invitation_id === inv.id) || []}
                  onSendInvite={() => handleSendInvite(inv)}
                  onAddSubEvent={(subEventId) => addStaffSubEvent.mutate({ staffInvitationId: inv.id, subEventId, competitionId })}
                  onRemoveSubEvent={(id) => removeStaffSubEvent.mutate({ id, competitionId })}
                  onDelete={() => deleteInvitation.mutate({ id: inv.id, competitionId })}
                  onEdit={setEditingInv}
                  sendingInvite={sendInvite.isPending}
                  isAdmin={isAdmin}
                  onMasquerade={handleMasquerade}
                  onPreviewEmail={isAdmin ? setPreviewInv : undefined}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {pending.length > 0 && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-amber-500" /> Pending Invitations ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {pending.map((inv) => (
                <StaffRow
                  key={inv.id}
                  inv={inv}
                  competitionId={competitionId}
                  levels={levels}
                  invitationSubEvents={invitationSubEvents?.filter(ise => ise.staff_invitation_id === inv.id) || []}
                  onSendInvite={() => handleSendInvite(inv)}
                  onAddSubEvent={(subEventId) => addStaffSubEvent.mutate({ staffInvitationId: inv.id, subEventId, competitionId })}
                  onRemoveSubEvent={(id) => removeStaffSubEvent.mutate({ id, competitionId })}
                  onDelete={() => deleteInvitation.mutate({ id: inv.id, competitionId })}
                  onEdit={setEditingInv}
                  sendingInvite={sendInvite.isPending}
                  isAdmin={isAdmin}
                  onMasquerade={handleMasquerade}
                  onPreviewEmail={isAdmin ? setPreviewInv : undefined}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {accepted.length > 0 && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-secondary" /> Accepted ({accepted.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {accepted.map((inv) => (
                <StaffRow
                  key={inv.id}
                  inv={inv}
                  competitionId={competitionId}
                  levels={levels}
                  invitationSubEvents={invitationSubEvents?.filter(ise => ise.staff_invitation_id === inv.id) || []}
                  onAddSubEvent={(subEventId) => addStaffSubEvent.mutate({ staffInvitationId: inv.id, subEventId, competitionId })}
                  onRemoveSubEvent={(id) => removeStaffSubEvent.mutate({ id, competitionId })}
                  onDelete={() => deleteInvitation.mutate({ id: inv.id, competitionId })}
                  onEdit={setEditingInv}
                  sendingInvite={false}
                  isAdmin={isAdmin}
                  onMasquerade={handleMasquerade}
                  onPreviewEmail={isAdmin ? setPreviewInv : undefined}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(!invitations || invitations.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No staff members added yet. Add judges and tabulators above.
        </p>
      )}

      {/* Edit Staff Dialog */}
      <EditStaffDialog
        inv={editingInv}
        competitionId={competitionId}
        onClose={() => setEditingInv(null)}
        onSave={(updates) => {
          if (editingInv) {
            updateInvitation.mutate({ id: editingInv.id, competitionId, updates }, {
              onSuccess: () => setEditingInv(null),
            });
          }
        }}
        saving={updateInvitation.isPending}
      />
    </div>
  );
}

/* ── Edit Staff Dialog ── */
function EditStaffDialog({ inv, competitionId, onClose, onSave, saving }: {
  inv: StaffInvitation | null;
  competitionId: string;
  onClose: () => void;
  onSave: (updates: { name?: string | null; email?: string; phone?: string | null; role?: any; is_chief?: boolean; is_production_assistant?: boolean }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [isChief, setIsChief] = useState(false);
  const [isPA, setIsPA] = useState(false);
  const [confirmingEmailChange, setConfirmingEmailChange] = useState(false);

  useEffect(() => {
    if (inv) {
      setName(inv.name || "");
      setEmail(inv.email);
      setPhone(inv.phone || "");
      setRole(inv.role);
      setIsChief(inv.is_chief);
      setIsPA(inv.is_production_assistant);
      setConfirmingEmailChange(false);
    }
  }, [inv]);

  if (!inv) return null;

  const emailChanged = email.trim().toLowerCase() !== inv.email.toLowerCase();

  const handleSave = () => {
    if (emailChanged && !confirmingEmailChange) {
      setConfirmingEmailChange(true);
      return;
    }
    setConfirmingEmailChange(false);
    onSave({
      name: name.trim() || null,
      email: email.trim(),
      phone: phone.trim() || null,
      role: role as any,
      is_chief: role === "judge" ? isChief : false,
      is_production_assistant: role === "organizer" ? isPA : false,
    });
  };

  return (
    <Dialog open={!!inv} onOpenChange={(open) => { if (!open) { setConfirmingEmailChange(false); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-mono">Edit Staff Member</DialogTitle>
        </DialogHeader>

        {confirmingEmailChange ? (
          <div className="grid gap-3 py-2">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Changing the email from <strong>{inv.email}</strong> to <strong>{email.trim()}</strong> will affect authentication and any pending invitations. The previous invitation link will no longer work. Are you sure?
              </AlertDescription>
            </Alert>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmingEmailChange(false)} disabled={saving}>Back</Button>
              <Button variant="destructive" size="sm" disabled={saving} onClick={handleSave}>
                {saving ? "Saving…" : "Confirm Change"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" placeholder="Full name" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 text-sm" type="email" placeholder="Email address" />
              {emailChanged && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Changing email requires confirmation
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 text-sm" placeholder="Phone (optional)" />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map(r => (
                    <SelectItem key={r} value={r}>{formatRoleName(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {role === "judge" && (
              <div className="flex items-center gap-2">
                <Checkbox id="edit-chief" checked={isChief} onCheckedChange={(c) => setIsChief(!!c)} />
                <Label htmlFor="edit-chief" className="text-xs">Chief Judge</Label>
              </div>
            )}
            {role === "organizer" && (
              <div className="flex items-center gap-2">
                <Checkbox id="edit-pa" checked={isPA} onCheckedChange={(c) => setIsPA(!!c)} />
                <Label htmlFor="edit-pa" className="text-xs">Production Assistant</Label>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button size="sm" disabled={saving || !email.trim()} onClick={handleSave}>
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Email Preview Dialog ── */
function EmailPreviewDialog({ inv, competitionName, onClose }: { inv: StaffInvitation | null; competitionName?: string; onClose: () => void }) {
  if (!inv) return null;

  const roleLabel =
    inv.role === "organizer" ? "Organizer"
    : inv.role === "judge" ? "Judge"
    : inv.role === "tabulator" ? "Tabulator"
    : inv.role === "chief_judge" ? "Chief Judge"
    : inv.role === "witness" ? "Witness"
    : String(inv.role);
  const compLabel = competitionName || "a competition";

  return (
    <Dialog open={!!inv} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-base">Email Preview</DialogTitle>
        </DialogHeader>
        <div className="p-6 pt-3">
          <div className="text-xs text-muted-foreground mb-3 space-y-1 border border-border rounded-md p-3 bg-muted/30">
            <p><span className="font-medium text-foreground">From:</span> Scorz &lt;no-reply@notify.scorz.live&gt;</p>
            <p><span className="font-medium text-foreground">To:</span> {inv.email}</p>
            <p><span className="font-medium text-foreground">Subject:</span> You're invited as {roleLabel} — {compLabel}</p>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <iframe
              title="Email preview"
              srcDoc={buildPreviewHtml(roleLabel, compLabel)}
              className="w-full border-0"
              style={{ height: "520px" }}
              sandbox=""
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function buildPreviewHtml(roleLabel: string, competitionLabel: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">You've been invited as ${roleLabel} for ${competitionLabel}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#1a1b25;padding:24px 32px;text-align:center;">
              <span style="font-size:28px;font-weight:800;letter-spacing:2px;color:#ffffff;">SCOR</span><span style="font-size:28px;font-weight:800;letter-spacing:2px;color:#f59e0b;">Z</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 24px;color:#1a1b25;font-size:15px;line-height:1.6;">
              <h1 style="font-size:22px;margin:0 0 8px;color:#1a1b25;">You're Invited</h1>
              <p style="color:#52525b;font-size:15px;line-height:1.6;">
                You've been assigned as <strong style="color:#1a1b25;">${roleLabel}</strong> for
                <strong style="color:#1a1b25;">${competitionLabel}</strong>.
              </p>
              <p style="color:#52525b;font-size:15px;line-height:1.6;">
                Click the button below to sign in and access your dashboard. No password needed — this is a secure one-time link.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td align="center" style="background-color:#1a1b25;border-radius:8px;">
                    <a href="#" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Sign In to Scorz
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#a1a1aa;font-size:12px;">
                If the button doesn't work, copy and paste the magic link from your email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e4e4e7;text-align:center;">
              <p style="margin:0;font-size:11px;color:#a1a1aa;font-family:'JetBrains Mono','Courier New',monospace;letter-spacing:1px;">
                &copy; 2026 SCORZ &nbsp;|&nbsp; Powered by phnyx.dev
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ── Staff Row Component ── */
interface StaffRowProps {
  inv: StaffInvitation;
  competitionId: string;
  levels: any[] | undefined;
  invitationSubEvents: StaffInvitationSubEvent[];
  onSendInvite?: () => void;
  onAddSubEvent: (subEventId: string) => void;
  onRemoveSubEvent: (id: string) => void;
  onDelete: () => void;
  onEdit: (inv: StaffInvitation) => void;
  sendingInvite: boolean;
  isAdmin?: boolean;
  onMasquerade?: (inv: StaffInvitation) => void;
  onPreviewEmail?: (inv: StaffInvitation) => void;
}

function StaffRow({ inv, competitionId, levels, invitationSubEvents, onSendInvite, onAddSubEvent, onRemoveSubEvent, onDelete, onEdit, sendingInvite, isAdmin, onMasquerade, onPreviewEmail }: StaffRowProps) {
  const [showAssign, setShowAssign] = useState(false);
  const [assignLevelId, setAssignLevelId] = useState("");
  const { data: subEventsForLevel } = useSubEvents(assignLevelId || undefined);

  const assignedSubEventIds = invitationSubEvents.map(ise => ise.sub_event_id);

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border border-border/50 bg-card/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${inv.accepted_at ? "bg-secondary/10" : inv.invited_at ? "bg-primary/10" : "bg-muted"}`}>
            <Mail className={`h-4 w-4 ${inv.accepted_at ? "text-secondary" : inv.invited_at ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {inv.name || inv.email}
            </p>
            {inv.name && <p className="text-xs text-muted-foreground">{inv.email}</p>}
            {inv.phone && <p className="text-xs text-muted-foreground">{inv.phone}</p>}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={roleColors[inv.role] || "bg-muted text-muted-foreground"} variant="secondary">
                {formatRoleName(inv.role)}
              </Badge>
              {inv.is_chief && (
                <Badge variant="outline" className="text-[10px] py-0 h-4 gap-0.5 border-primary/50 text-primary">
                  <ShieldCheck className="h-2.5 w-2.5" /> Chief Judge
                </Badge>
              )}
              {inv.is_production_assistant && (
                <Badge variant="outline" className="text-[10px] py-0 h-4 gap-0.5 border-accent/50 text-accent">
                  <ClipboardList className="h-2.5 w-2.5" /> Production Assistant
                </Badge>
              )}
              {inv.accepted_at ? (
                <Badge variant="secondary" className="text-[10px] py-0 h-4 gap-1">
                  <CheckCircle className="h-2.5 w-2.5" /> Accepted
                </Badge>
              ) : inv.invited_at ? (
                <Badge variant="outline" className="text-[10px] py-0 h-4 gap-1 border-amber-500/50 text-amber-600 dark:text-amber-400">
                  <Clock className="h-2.5 w-2.5" /> Invited
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] py-0 h-4 gap-1 text-muted-foreground">
                  Not Invited
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {isAdmin && onPreviewEmail && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPreviewEmail(inv)}
              className="text-xs text-muted-foreground"
              title="Preview invitation email"
            >
              <Eye className="h-3 w-3 mr-1" /> Preview
            </Button>
          )}
          {!inv.invited_at && !inv.accepted_at && onSendInvite && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSendInvite}
              disabled={sendingInvite}
              className="text-xs"
            >
              <Send className="h-3 w-3 mr-1" /> Invite
            </Button>
          )}
          {inv.invited_at && !inv.accepted_at && onSendInvite && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSendInvite}
              disabled={sendingInvite}
              className="text-xs"
              title="Resend invitation"
            >
              <Send className="h-3 w-3 mr-1" /> Resend
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            onClick={() => onEdit(inv)}
            title="Edit staff member"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            title="Remove staff member"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {isAdmin && onMasquerade && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-muted-foreground hover:text-primary"
              onClick={() => onMasquerade(inv)}
              title={`View as ${inv.name || inv.email}`}
            >
              <Eye className="h-3.5 w-3.5" /> View as
            </Button>
          )}
        </div>
      </div>

      {/* Assigned sub-events */}
      {invitationSubEvents.length > 0 && (
        <div className="pl-4 sm:pl-11 flex flex-wrap gap-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider self-center mr-1">Assigned:</span>
          {invitationSubEvents.map((ise) => (
            <SubEventBadge
              key={ise.id}
              subEventId={ise.sub_event_id}
              onRemove={() => onRemoveSubEvent(ise.id)}
            />
          ))}
        </div>
      )}

      {/* Sub-event assignment inline */}
      {!showAssign ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-start text-xs text-muted-foreground"
          onClick={() => setShowAssign(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Assign to sub-event
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2 items-end pl-4 sm:pl-11">
          <div className="min-w-[140px]">
            <label className="text-[10px] text-muted-foreground">Level</label>
            <Select value={assignLevelId} onValueChange={setAssignLevelId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Level" /></SelectTrigger>
              <SelectContent>
                {levels?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {assignLevelId && (
            <div className="min-w-[140px]">
              <label className="text-[10px] text-muted-foreground">Sub-Event</label>
              <Select onValueChange={(v) => { onAddSubEvent(v); setShowAssign(false); setAssignLevelId(""); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sub-event" /></SelectTrigger>
                <SelectContent>
                  {subEventsForLevel
                    ?.filter(se => !assignedSubEventIds.includes(se.id))
                    .map(se => <SelectItem key={se.id} value={se.id}>{se.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setShowAssign(false); setAssignLevelId(""); }}>Cancel</Button>
        </div>
      )}
    </div>
  );
}

/* ── Sub-Event Badge with name lookup ── */
function SubEventBadge({ subEventId, onRemove }: { subEventId: string; onRemove: () => void }) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.from("sub_events").select("name").eq("id", subEventId).maybeSingle().then(({ data }) => {
      if (!cancelled && data) setName(data.name);
    });
    return () => { cancelled = true; };
  }, [subEventId]);

  return (
    <Badge variant="outline" className="text-[10px] py-0 h-5 gap-1 pr-1">
      <MapPin className="h-2.5 w-2.5" />
      {name || subEventId.slice(0, 8)}
      <button
        onClick={onRemove}
        className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </Badge>
  );
}
