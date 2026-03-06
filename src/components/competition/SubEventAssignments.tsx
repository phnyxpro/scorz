import { useState, useMemo } from "react";
import { formatRoleName } from "@/lib/utils";
import {
  useSubEventAssignments,
  useAssignableUsers,
  useAddAssignment,
  useRemoveAssignment,
} from "@/hooks/useSubEventAssignments";
import { useLevels, useSubEvents } from "@/hooks/useCompetitions";
import { useStaffInvitations, useInviteStaff, useDeleteInvitation } from "@/hooks/useStaffInvitations";
import { useCompetitionLimits, useCompetitionStaffCounts } from "@/hooks/useCompetitionLimits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { UserPlus, X, Users, ShieldCheck, Mail, Trash2, CheckCircle, Clock, AlertTriangle } from "lucide-react";

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
  const inviteStaff = useInviteStaff();
  const deleteInvitation = useDeleteInvitation();
  const { data: invitations } = useStaffInvitations(competitionId);

  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [selectedSubEventId, setSelectedSubEventId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedResponsibility, setSelectedResponsibility] = useState("");
  const [isChief, setIsChief] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [mode, setMode] = useState<"assign" | "invite">("assign");

  if (levels?.length && !selectedLevelId) setSelectedLevelId(levels[0].id);

  const { data: subEvents } = useSubEvents(selectedLevelId || undefined);
  const { data: assignments } = useSubEventAssignments(selectedSubEventId || undefined);

  const filteredUsers = useMemo(() => {
    if (!assignableUsers || !selectedRole) return [];
    return assignableUsers.filter((u) => u.roles.includes(selectedRole));
  }, [assignableUsers, selectedRole]);

  const assignedSet = useMemo(() => {
    if (!assignments) return new Set<string>();
    return new Set(assignments.map((a) => `${a.user_id}:${a.role}`));
  }, [assignments]);

  // Check if a role is at its limit
  const isRoleAtLimit = (role: string): boolean => {
    if (!tierLimits || !staffCounts) return false;
    if (role === "judge") return staffCounts.judges >= tierLimits.judges;
    if (role === "tabulator") return staffCounts.tabulators >= tierLimits.tabulators;
    if (role === "organizer") return staffCounts.organizers >= tierLimits.organizers;
    return false;
  };

  const handleAdd = () => {
    if (!selectedSubEventId || !selectedUserId || !selectedRole) return;
    if (isRoleAtLimit(selectedRole)) {
      return; // blocked by UI, but safeguard
    }
    addAssignment.mutate({
      sub_event_id: selectedSubEventId,
      user_id: selectedUserId,
      role: selectedRole,
      ...(selectedRole === "judge" ? { is_chief: isChief } : {}),
      ...(selectedRole === "tabulator" && selectedResponsibility ? { responsibility: selectedResponsibility } : {}),
    });
    setSelectedUserId("");
    setSelectedResponsibility("");
    setIsChief(false);
  };

  const handleInvite = () => {
    if (!inviteEmail || !selectedRole) return;
    inviteStaff.mutate({
      email: inviteEmail,
      role: selectedRole as any,
      competitionId,
      competitionName,
    });
    setInviteEmail("");
  };

  const userName = (userId: string) => {
    const u = assignableUsers?.find((u) => u.user_id === userId);
    return u?.full_name || u?.email || userId.slice(0, 8) + "…";
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Staff Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Level & Sub-Event selectors */}
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
              {/* Role selector */}
              <div>
                <label className="text-xs text-muted-foreground">Role</label>
                <Select value={selectedRole} onValueChange={(v) => { setSelectedRole(v); setSelectedUserId(""); setSelectedResponsibility(""); setIsChief(false); setInviteEmail(""); }}>
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
                  {/* Staff limit indicator */}
                  {tierLimits && staffCounts && (
                    <div className="space-y-2 p-3 rounded-lg border border-border/50 bg-muted/30">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">
                          {selectedRole === "judge" ? "Judges" : selectedRole === "tabulator" ? "Tabulators" : "Organisers"} assigned
                        </span>
                        <span className="font-mono text-foreground">
                          {selectedRole === "judge" ? staffCounts.judges : selectedRole === "tabulator" ? staffCounts.tabulators : staffCounts.organizers}
                          {" / "}
                          {selectedRole === "judge" ? tierLimits.judges : selectedRole === "tabulator" ? tierLimits.tabulators : tierLimits.organizers}
                        </span>
                      </div>
                      <Progress
                        value={
                          ((selectedRole === "judge" ? staffCounts.judges : selectedRole === "tabulator" ? staffCounts.tabulators : staffCounts.organizers) /
                          (selectedRole === "judge" ? tierLimits.judges : selectedRole === "tabulator" ? tierLimits.tabulators : tierLimits.organizers)) * 100
                        }
                        className="h-1.5"
                      />
                      {isRoleAtLimit(selectedRole) && (
                        <Alert className="border-accent/30 bg-accent/5 py-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-accent" />
                          <AlertDescription className="text-xs">
                            {selectedRole} limit reached for this competition's plan. Upgrade to add more.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* Mode toggle */}
                  <Tabs value={mode} onValueChange={(v) => setMode(v as "assign" | "invite")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="assign">Assign Existing User</TabsTrigger>
                      <TabsTrigger value="invite">Invite by Email</TabsTrigger>
                    </TabsList>

                    <TabsContent value="assign" className="mt-3">
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
                        {selectedRole === "tabulator" && (
                          <div className="min-w-[140px]">
                            <label className="text-xs text-muted-foreground">Responsibility</label>
                            <Select value={selectedResponsibility} onValueChange={setSelectedResponsibility}>
                              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="full">Full Tabulator</SelectItem>
                                <SelectItem value="timer">Timer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <Button
                          size="sm"
                          onClick={handleAdd}
                          disabled={!selectedUserId || (selectedRole === "tabulator" && !selectedResponsibility) || addAssignment.isPending || isRoleAtLimit(selectedRole)}
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1" /> Assign
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="invite" className="mt-3">
                      <div className="flex flex-wrap gap-2 items-end">
                        <div className="flex-1 min-w-[200px]">
                          <label className="text-xs text-muted-foreground">Email Address</label>
                          <Input
                            type="email"
                            placeholder="colleague@example.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={handleInvite}
                          disabled={!inviteEmail || inviteStaff.isPending}
                        >
                          <Mail className="h-3.5 w-3.5 mr-1" /> Send Invite
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </>
              )}

              {/* Current assignments */}
              {assignments && assignments.length > 0 && (
                <div className="space-y-2">
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
                              {a.responsibility && (
                                <Badge variant="outline" className="text-[10px]">
                                  {a.responsibility === "timer" ? "Timer" : "Full"}
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

          {/* Pending invitations for this competition */}
          {invitations && invitations.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Invitations</h3>
              <div className="grid gap-2">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${inv.accepted_at ? "bg-secondary/10" : "bg-primary/10"}`}>
                        <Mail className={`h-4 w-4 ${inv.accepted_at ? "text-secondary" : "text-primary"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{inv.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] py-0 h-4 uppercase">
                            {inv.role}
                          </Badge>
                          {inv.accepted_at ? (
                            <Badge variant="secondary" className="text-[10px] py-0 h-4 gap-1">
                              <CheckCircle className="h-2.5 w-2.5" /> Accepted
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 gap-1 border-amber-500/50 text-amber-500">
                              <Clock className="h-2.5 w-2.5" /> Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {!inv.accepted_at && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteInvitation.mutate({ id: inv.id, competitionId })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
