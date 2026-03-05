import { useState, useMemo } from "react";
import {
  useSubEventAssignments,
  useAssignableUsers,
  useAddAssignment,
  useRemoveAssignment,
} from "@/hooks/useSubEventAssignments";
import { useLevels, useSubEvents } from "@/hooks/useCompetitions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { UserPlus, X, Users, ShieldCheck } from "lucide-react";

const ASSIGNABLE_ROLES = ["judge", "tabulator"] as const;

const roleColors: Record<string, string> = {
  judge: "bg-primary/20 text-primary",
  tabulator: "bg-secondary/20 text-secondary-foreground",
};

interface Props {
  competitionId: string;
}

export function SubEventAssignments({ competitionId }: Props) {
  const { data: levels } = useLevels(competitionId);
  const { data: assignableUsers } = useAssignableUsers();
  const addAssignment = useAddAssignment();
  const removeAssignment = useRemoveAssignment();

  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [selectedSubEventId, setSelectedSubEventId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedResponsibility, setSelectedResponsibility] = useState("");
  const [isChief, setIsChief] = useState(false);

  if (levels?.length && !selectedLevelId) setSelectedLevelId(levels[0].id);

  const { data: subEvents } = useSubEvents(selectedLevelId || undefined);
  const { data: assignments } = useSubEventAssignments(selectedSubEventId || undefined);

  // Filter users by selected role
  const filteredUsers = useMemo(() => {
    if (!assignableUsers || !selectedRole) return [];
    return assignableUsers.filter((u) => u.roles.includes(selectedRole));
  }, [assignableUsers, selectedRole]);

  // Already assigned user+role combos
  const assignedSet = useMemo(() => {
    if (!assignments) return new Set<string>();
    return new Set(assignments.map((a) => `${a.user_id}:${a.role}`));
  }, [assignments]);

  const handleAdd = () => {
    if (!selectedSubEventId || !selectedUserId || !selectedRole) return;
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

  const userName = (userId: string) => {
    const u = assignableUsers?.find((u) => u.user_id === userId);
    return u?.full_name || u?.email || userId.slice(0, 8) + "…";
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Sub-Event Assignments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selectors */}
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
              {/* Add assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <div>
                  <label className="text-xs text-muted-foreground">Role</label>
                  <Select value={selectedRole} onValueChange={(v) => { setSelectedRole(v); setSelectedUserId(""); setSelectedResponsibility(""); setIsChief(false); }}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">User</label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={!selectedRole}>
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
                {selectedRole === "tabulator" && (
                  <div>
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
                  disabled={!selectedUserId || !selectedRole || (selectedRole === "tabulator" && !selectedResponsibility) || addAssignment.isPending}
                  className="w-full sm:w-auto"
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Assign
                </Button>
              </div>

              {/* Current assignments */}
              {assignments && assignments.length > 0 ? (
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
                              {a.role.replace("_", " ")}
                            </Badge>
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
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No users assigned to this sub-event yet.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
