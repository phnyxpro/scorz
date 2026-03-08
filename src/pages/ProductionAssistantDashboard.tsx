import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { ClipboardList, UserX, Ban, LogOut as DropOutIcon, RotateCcw } from "lucide-react";

const statusColors: Record<string, string> = {
  approved: "bg-secondary/20 text-secondary-foreground",
  pending: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  no_show: "bg-destructive/20 text-destructive",
  disqualified: "bg-destructive/20 text-destructive",
  dropped_out: "bg-muted text-muted-foreground",
};

const statusLabel: Record<string, string> = {
  approved: "Active",
  pending: "Pending",
  no_show: "No Show",
  disqualified: "Disqualified",
  dropped_out: "Drop Out",
};

export default function ProductionAssistantDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Get assigned competitions for this user (production assistant organizers)
  const { data: assignments } = useQuery({
    queryKey: ["pa-assigned-competitions", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_assigned_competitions", { _user_id: user!.id });
      if (error) throw error;
      return data as any[];
    },
  });

  // Deduplicate competitions
  const competitions = useMemo(() => {
    if (!assignments) return [];
    const map = new Map<string, { id: string; name: string }>();
    for (const a of assignments) {
      if (!map.has(a.competition_id)) {
        map.set(a.competition_id, { id: a.competition_id, name: a.competition_name });
      }
    }
    return Array.from(map.values());
  }, [assignments]);

  const [selectedCompId, setSelectedCompId] = useState<string>("");
  const activeCompId = selectedCompId || competitions[0]?.id || "";

  // Fetch registrations for the selected competition
  const { data: registrations, isLoading } = useQuery({
    queryKey: ["pa-registrations", activeCompId],
    enabled: !!activeCompId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contestant_registrations")
        .select("id, full_name, age_category, status, sort_order, sub_event_id")
        .eq("competition_id", activeCompId)
        .in("status", ["approved", "no_show", "disqualified", "dropped_out"])
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch sub-event names for display
  const subEventIds = useMemo(() => {
    const ids = new Set<string>();
    registrations?.forEach(r => { if (r.sub_event_id) ids.add(r.sub_event_id); });
    return Array.from(ids);
  }, [registrations]);

  const { data: subEventNames } = useQuery({
    queryKey: ["pa-sub-event-names", subEventIds],
    enabled: subEventIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("sub_events")
        .select("id, name")
        .in("id", subEventIds);
      const map: Record<string, string> = {};
      data?.forEach(se => { map[se.id] = se.name; });
      return map;
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async ({ registrationId, newStatus }: { registrationId: string; newStatus: string }) => {
      const { error } = await supabase.rpc("withdraw_contestant", {
        _registration_id: registrationId,
        _new_status: newStatus,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pa-registrations", activeCompId] });
      toast({ title: "Status updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleStatusChange = (registrationId: string, newStatus: string) => {
    withdrawMutation.mutate({ registrationId, newStatus });
  };

  return (
    <>
      <SEO title="Production Assistant" description="Manage contestant attendance and status" />
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold font-mono tracking-tight flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-accent" />
            Production Assistant
          </h1>
          {competitions.length > 1 && (
            <Select value={activeCompId} onValueChange={setSelectedCompId}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Select competition" />
              </SelectTrigger>
              <SelectContent>
                {competitions.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {competitions.length === 1 && (
          <p className="text-sm text-muted-foreground">{competitions[0].name}</p>
        )}

        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono">
              Contestants ({registrations?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-sm text-muted-foreground p-4">Loading…</p>
            ) : !registrations?.length ? (
              <p className="text-sm text-muted-foreground p-4 text-center">No contestants found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Category</TableHead>
                    <TableHead className="hidden md:table-cell">Sub-Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrations.map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.sort_order || i + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{r.full_name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground capitalize">{r.age_category}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {r.sub_event_id ? (subEventNames?.[r.sub_event_id] || "—") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[r.status] || "bg-muted"} variant="secondary">
                          {statusLabel[r.status] || r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {r.status === "approved" ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 text-destructive hover:text-destructive"
                                onClick={() => handleStatusChange(r.id, "no_show")}
                                disabled={withdrawMutation.isPending}
                              >
                                <UserX className="h-3 w-3 mr-1" /> No Show
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 text-destructive hover:text-destructive"
                                onClick={() => handleStatusChange(r.id, "disqualified")}
                                disabled={withdrawMutation.isPending}
                              >
                                <Ban className="h-3 w-3 mr-1" /> DQ
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 text-destructive hover:text-destructive"
                                onClick={() => handleStatusChange(r.id, "dropped_out")}
                                disabled={withdrawMutation.isPending}
                              >
                                <DropOutIcon className="h-3 w-3 mr-1" /> Drop Out
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 text-secondary hover:text-secondary"
                              onClick={() => handleStatusChange(r.id, "approved")}
                              disabled={withdrawMutation.isPending}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" /> Reinstate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
