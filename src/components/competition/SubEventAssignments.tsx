import { useState, useMemo } from "react";
import { formatRoleName } from "@/lib/utils";
import {
  useSubEventAssignments,
  useAssignableUsers,
  useAddAssignment,
  useRemoveAssignment,
} from "@/hooks/useSubEventAssignments";
import { useLevels, useSubEvents } from "@/hooks/useCompetitions";
import {
  useStaffInvitations,
  useStaffInvitationSubEvents,
  useAddStaffMember,
  useSendStaffInvite,
  useAddStaffSubEvent,
  useRemoveStaffSubEvent,
  useDeleteInvitation,
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
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { UserPlus, X, Users, ShieldCheck, Mail, Trash2, CheckCircle, Clock, AlertTriangle, Send, MapPin, Plus } from "lucide-react";

const ASSIGNABLE_ROLES = ["judge", "tabulator"] as const;

const roleColors: Record<string, string> = {
  judge: "bg-primary/20 text-primary",
  tabulator: "bg-secondary/20 text-secondary-foreground",
};

interface Props {
  competitionId: string;
  competitionName?: string;
}

export function SubEventAssignments({ competitionId, competitionName }: Props) {
  const { data: levels } = useLevels(competitionId);
  const { data: assignableUsers } = useAssignableUsers();
  const addAssignment = useAddAssignment();
  const removeAssignment = useRemoveAssignment();
  const { data: tierLimits } = useCompetitionLimits(competitionId);
  const { data: staffCounts } = useCompetitionStaffCounts(competitionId);
  const addStaffMember = useAddStaffMember();
  const sendInvite = useSendStaffInvite();
  const addStaffSubEvent = useAddStaffSubEvent();
  const removeStaffSubEvent = useRemoveStaffSubEvent();
  const deleteInvitation = useDeleteInvitation();
  const { data: invitations } = useStaffInvitations(competitionId);
  const { data: invitationSubEvents } = useStaffInvitationSubEvents(competitionId);

  // Staff roster form
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffRole, setStaffRole] = useState<string>("judge");
  const [staffIsChief, setStaffIsChief] = useState(false);

  // Sub-event assignment
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [selectedSubEventId, setSelectedSubEventId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [isChief, setIsChief] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<"roster" | "assign">("roster");

  if (levels?.length && !selectedLevelId) setSelectedLevelId(levels[0].id);

  const { data: subEvents } = useSubEvents(selectedLevelId || undefined);
  const { data: assignments } = useSubEventAssignments(selectedSubEventId || undefined);

  // Fetch all sub-events for all levels (for displaying assigned sub-event names)
  const allLevelIds = useMemo(() => levels?.map(l => l.id) || [], [levels]);

  const filteredUsers = useMemo(() => {
    if (!assignableUsers || !selectedRole) return [];
    return assignableUsers.filter((u) => u.roles.includes(selectedRole));
  }, [assignableUsers, selectedRole]);

  const assignedSet = useMemo(() => {
    if (!assignments) return new Set<string>();
    return new Set(assignments.map((a) => `${a.user_id}:${a.role}`));
  }, [assignments]);

  const isRoleAtLimit = (role: string): boolean => {
    if (!tierLimits || !staffCounts) return false;
    if (role === "judge") return staffCounts.judges >= tierLimits.judges;
    if (role === "tabulator") return staffCounts.tabulators >= tierLimits.tabulators;
    return false;
  };

  // Check if a level already has a chief judge in staff_invitations
  const levelHasChief = (levelId: string): boolean => {
    if (!invitations || !invitationSubEvents || !levels) return false;
    // Find all sub-events for this level
    // We need to check which invitations are marked as chief and assigned to sub-events in this level
    const chiefInvitations = invitations.filter(i => i.is_chief && i.role === "judge");
    if (!chiefInvitations.length) return false;
    // For now, just check if any chief judge exists for the competition
    return chiefInvitations.length > 0;
  };

  const handleAddStaff = () => {
    if (!staffEmail || !staffRole) return;
    addStaffMember.mutate({
      name: staffName || undefined,
      email: staffEmail,
      phone: staffPhone || undefined,
      role: staffRole as any,
      competitionId,
      isChief: staffRole === "judge" ? staffIsChief : false,
    });
    setStaffName("");
    setStaffEmail("");
    setStaffPhone("");
    setStaffIsChief(false);
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

  const handleAssignExisting = () => {
    if (!selectedSubEventId || !selectedUserId || !selectedRole) return;
    if (isRoleAtLimit(selectedRole)) return;
    addAssignment.mutate({
      sub_event_id: selectedSubEventId,
      user_id: selectedUserId,
      role: selectedRole,
      ...(selectedRole === "judge" ? { is_chief: isChief } : {}),
    });
    setSelectedUserId("");
    setIsChief(false);
  };

  const userName = (userId: string) => {
    const u = assignableUsers?.find((u) => u.user_id === userId);
    return u?.full_name || u?.email || userId.slice(0, 8) + "…";
  };

  // Group invitations by status
  const uninvited = invitations?.filter(i => !i.invited_at && !i.accepted_at) || [];
  const pending = invitations?.filter(i => i.invited_at && !i.accepted_at) || [];
  const accepted = invitations?.filter(i => i.accepted_at) || [];

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roster">Staff Roster</TabsTrigger>
          <TabsTrigger value="assign">Sub-Event Assignments</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Staff Roster ── */}
        <TabsContent value="roster" className="space-y-4 mt-4">
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4" /> Add Staff Member
              </CardTitle>
              <CardDescription>Add judges and tabulators to your competition roster. You can send invitations later.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email Address *</Label>
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddStaff()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Phone (optional)</Label>
                  <Input
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Role</Label>
                  <Select value={staffRole} onValueChange={(v) => { setStaffRole(v); if (v !== "judge") setStaffIsChief(false); }}>
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
                <div className="flex items-center gap-2 mt-3">
                  <Checkbox
                    id="chief-judge-check"
                    checked={staffIsChief}
                    onCheckedChange={(v) => setStaffIsChief(v === true)}
                  />
                  <label htmlFor="chief-judge-check" className="text-sm cursor-pointer flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Designate as Chief Judge
                  </label>
                </div>
              )}
              <div className="flex justify-end mt-4">
                <Button
                  size="sm"
                  onClick={handleAddStaff}
                  disabled={!staffEmail || addStaffMember.isPending}
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>

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
                      sendingInvite={sendInvite.isPending}
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
                      sendingInvite={sendInvite.isPending}
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
                      sendingInvite={false}
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
        </TabsContent>

        {/* ── Tab 2: Sub-Event Assignments (existing users) ── */}
        <TabsContent value="assign" className="space-y-4 mt-4">
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Assign to Sub-Event
              </CardTitle>
              <CardDescription>Assign existing platform users to specific sub-events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Level</label>
                  <Select value={selectedLevelId} onValueChange={(v) => { setSelectedLevelId(v); setSelectedSubEventId(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {levels?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Sub-Event</label>
                  <Select value={selectedSubEventId} onValueChange={setSelectedSubEventId}>
                    <SelectTrigger><SelectValue placeholder="Select sub-event" /></SelectTrigger>
                    <SelectContent>
                      {subEvents?.map((se) => <SelectItem key={se.id} value={se.id}>{se.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedSubEventId && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">Role</label>
                    <Select value={selectedRole} onValueChange={(v) => { setSelectedRole(v); setSelectedUserId(""); setIsChief(false); }}>
                      <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                      <SelectContent>
                        {ASSIGNABLE_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{formatRoleName(r)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRole && (
                    <>
                      {tierLimits && staffCounts && (
                        <div className="space-y-2 p-3 rounded-lg border border-border/50 bg-muted/30">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground font-medium">
                              {selectedRole === "judge" ? "Judges" : "Tabulators"} assigned
                            </span>
                            <span className="font-mono text-foreground">
                              {selectedRole === "judge" ? staffCounts.judges : staffCounts.tabulators}
                              {" / "}
                              {selectedRole === "judge" ? tierLimits.judges : tierLimits.tabulators}
                            </span>
                          </div>
                          <Progress
                            value={
                              ((selectedRole === "judge" ? staffCounts.judges : staffCounts.tabulators) /
                              (selectedRole === "judge" ? tierLimits.judges : tierLimits.tabulators)) * 100
                            }
                            className="h-1.5"
                          />
                          {isRoleAtLimit(selectedRole) && (
                            <Alert className="border-accent/30 bg-accent/5 py-2">
                              <AlertTriangle className="h-3.5 w-3.5 text-accent" />
                              <AlertDescription className="text-xs">
                                {selectedRole} limit reached. Upgrade to add more.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 items-end">
                        <div className="flex-1 min-w-[180px]">
                          <label className="text-xs text-muted-foreground">User</label>
                          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                            <SelectContent>
                              {filteredUsers
                                .filter((u) => !assignedSet.has(`${u.user_id}:${selectedRole}`))
                                .map((u) => (
                                  <SelectItem key={u.user_id} value={u.user_id}>
                                    {u.full_name || u.email || u.user_id.slice(0, 8)}
                                  </SelectItem>
                                ))}
                              {filteredUsers.filter((u) => !assignedSet.has(`${u.user_id}:${selectedRole}`)).length === 0 && (
                                <div className="px-2 py-1.5 text-xs text-muted-foreground">No available users with this role</div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        {selectedRole === "judge" && (
                          <div className="flex items-center gap-2 pb-1">
                            <Switch checked={isChief} onCheckedChange={setIsChief} id="is-chief-toggle" />
                            <label htmlFor="is-chief-toggle" className="text-xs text-muted-foreground cursor-pointer">Chief Judge</label>
                          </div>
                        )}
                        <Button
                          size="sm"
                          onClick={handleAssignExisting}
                          disabled={!selectedUserId || addAssignment.isPending || isRoleAtLimit(selectedRole)}
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1" /> Assign
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Current assignments table */}
                  {assignments && assignments.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Assignments</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="w-12" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignments.map((a) => (
                            <TableRow key={a.id}>
                              <TableCell className="text-sm">{userName(a.user_id)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Badge className={roleColors[a.role] || "bg-muted text-muted-foreground"}>
                                    {formatRoleName(a.role)}
                                  </Badge>
                                  {(a as any).is_chief && (
                                    <Badge variant="outline" className="text-[10px] border-primary/50 text-primary gap-0.5">
                                      <ShieldCheck className="h-2.5 w-2.5" /> Chief
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => removeAssignment.mutate({ id: a.id, sub_event_id: a.sub_event_id })}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {assignments && assignments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No users assigned to this sub-event yet.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
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
  sendingInvite: boolean;
}

function StaffRow({ inv, competitionId, levels, invitationSubEvents, onSendInvite, onAddSubEvent, onRemoveSubEvent, onDelete, sendingInvite }: StaffRowProps) {
  const [showAssign, setShowAssign] = useState(false);
  const [assignLevelId, setAssignLevelId] = useState("");
  const { data: subEventsForLevel } = useSubEvents(assignLevelId || undefined);

  // Get sub-event names for display
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
        <div className="flex items-center gap-1">
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
          {!inv.accepted_at && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Assigned sub-events */}
      {invitationSubEvents.length > 0 && (
        <div className="pl-11 flex flex-wrap gap-1.5">
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
        <div className="flex flex-wrap gap-2 items-end pl-11">
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

  // Fetch sub-event name on mount
  useState(() => {
    void (async () => {
      const { supabase: sb } = await import("@/integrations/supabase/client");
      const { data } = await sb.from("sub_events").select("name").eq("id", subEventId).maybeSingle();
      if (data) setName(data.name);
    })();
  });

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
