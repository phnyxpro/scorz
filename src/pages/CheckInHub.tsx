import { useState, useMemo } from "react";
import { useCompetitions } from "@/hooks/useCompetitions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, TicketCheck, Users, CheckCircle2, Clock } from "lucide-react";

export default function CheckInHub() {
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("");
  const [scanInput, setScanInput] = useState("");
  const { data: competitions } = useCompetitions();
  const queryClient = useQueryClient();

  // Fetch sub-events for the selected competition (to join with tickets)
  const { data: subEvents } = useQuery({
    queryKey: ["check-in-sub-events", selectedCompetitionId],
    enabled: !!selectedCompetitionId,
    queryFn: async () => {
      const { data: levels } = await supabase
        .from("competition_levels")
        .select("id")
        .eq("competition_id", selectedCompetitionId);
      if (!levels?.length) return [];
      const { data, error } = await supabase
        .from("sub_events")
        .select("id, name")
        .in("level_id", levels.map((l) => l.id));
      if (error) throw error;
      return data ?? [];
    },
  });

  const subEventIds = useMemo(() => subEvents?.map((se) => se.id) ?? [], [subEvents]);
  const subEventMap = useMemo(() => {
    const m: Record<string, string> = {};
    subEvents?.forEach((se) => (m[se.id] = se.name));
    return m;
  }, [subEvents]);

  // Fetch tickets for those sub-events
  const { data: tickets } = useQuery({
    queryKey: ["check-in-tickets", subEventIds],
    enabled: subEventIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_tickets")
        .select("*")
        .in("sub_event_id", subEventIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const checkedIn = tickets?.filter((t) => t.is_checked_in).length ?? 0;
  const total = tickets?.length ?? 0;
  const pending = total - checkedIn;

  const checkInMutation = useMutation({
    mutationFn: async (ticketNumber: string) => {
      const { data, error } = await supabase
        .from("event_tickets")
        .update({ is_checked_in: true, checked_in_at: new Date().toISOString() })
        .eq("ticket_number", ticketNumber)
        .in("sub_event_id", subEventIds)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["check-in-tickets"] });
      toast({ title: "Checked in!", description: `${data.full_name} — ${data.ticket_number}` });
      setScanInput("");
    },
    onError: () => {
      toast({ title: "Check-in failed", description: "Ticket not found or already checked in.", variant: "destructive" });
    },
  });

  const handleScan = () => {
    const trimmed = scanInput.trim();
    if (!trimmed) return;
    // Check if already checked in
    const match = tickets?.find((t) => t.ticket_number === trimmed);
    if (match?.is_checked_in) {
      toast({ title: "Already checked in", description: `${match.full_name} was checked in at ${new Date(match.checked_in_at!).toLocaleTimeString()}`, variant: "destructive" });
      setScanInput("");
      return;
    }
    checkInMutation.mutate(trimmed);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Ticket Check-In</h1>

      <Select value={selectedCompetitionId} onValueChange={setSelectedCompetitionId}>
        <SelectTrigger className="max-w-md">
          <SelectValue placeholder="Select a competition" />
        </SelectTrigger>
        <SelectContent>
          {competitions?.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedCompetitionId && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Total</CardTitle>
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">{total}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Checked In</CardTitle>
              </CardHeader>
              <CardContent><p className="text-2xl font-bold text-green-600">{checkedIn}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Pending</CardTitle>
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">{pending}</p></CardContent>
            </Card>
          </div>

          {/* Scan input */}
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={(e) => { e.preventDefault(); handleScan(); }} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Scan or enter ticket number…"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button type="submit" disabled={checkInMutation.isPending}>
                  <TicketCheck className="h-4 w-4 mr-2" /> Check In
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Tickets table */}
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Sub-Event</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets?.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.ticket_number}</TableCell>
                      <TableCell>{t.full_name}</TableCell>
                      <TableCell>{t.email}</TableCell>
                      <TableCell>{subEventMap[t.sub_event_id] ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{t.ticket_type}</Badge></TableCell>
                      <TableCell>
                        {t.is_checked_in ? (
                          <Badge className="bg-green-600 text-white">Checked In</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!tickets || tickets.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">No tickets found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
