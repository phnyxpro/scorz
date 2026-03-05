import { useState, useMemo } from "react";
import { useCompetitions } from "@/hooks/useCompetitions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Ticket, Users, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";

export default function TicketsHub() {
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: competitions } = useCompetitions();

  // Fetch sub-events with price info
  const { data: subEvents } = useQuery({
    queryKey: ["tickets-hub-sub-events", selectedCompetitionId],
    enabled: !!selectedCompetitionId,
    queryFn: async () => {
      const { data: levels } = await supabase
        .from("competition_levels")
        .select("id")
        .eq("competition_id", selectedCompetitionId);
      if (!levels?.length) return [];
      const { data, error } = await supabase
        .from("sub_events")
        .select("id, name, ticket_price, ticketing_type")
        .in("level_id", levels.map((l) => l.id));
      if (error) throw error;
      return data ?? [];
    },
  });

  const subEventIds = useMemo(() => subEvents?.map((se) => se.id) ?? [], [subEvents]);
  const subEventMap = useMemo(() => {
    const m: Record<string, { name: string; ticket_price: number | null; ticketing_type: string }> = {};
    subEvents?.forEach((se) => (m[se.id] = { name: se.name, ticket_price: se.ticket_price, ticketing_type: se.ticketing_type }));
    return m;
  }, [subEvents]);

  // Fetch tickets
  const { data: tickets } = useQuery({
    queryKey: ["tickets-hub-tickets", subEventIds],
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

  // Stats
  const total = tickets?.length ?? 0;
  const checkedIn = tickets?.filter((t) => t.is_checked_in).length ?? 0;
  const pending = total - checkedIn;
  const revenue = useMemo(() => {
    if (!tickets) return 0;
    return tickets.reduce((sum, t) => {
      const se = subEventMap[t.sub_event_id];
      return sum + (se?.ticket_price ?? 0);
    }, 0);
  }, [tickets, subEventMap]);

  // Filter
  const filtered = useMemo(() => {
    if (!tickets) return [];
    if (!searchQuery.trim()) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter(
      (t) =>
        t.full_name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.ticket_number.toLowerCase().includes(q) ||
        (t.phone?.toLowerCase().includes(q))
    );
  }, [tickets, searchQuery]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tickets</h1>

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Ticket className="h-4 w-4" /> Total</CardTitle>
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" /> Revenue</CardTitle>
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">${revenue.toFixed(2)}</p></CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, email, or ticket #…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tickets table */}
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>QR</TableHead>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Sub-Event</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Purchased</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => {
                    const se = subEventMap[t.sub_event_id];
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <QRCodeSVG value={t.ticket_number} size={40} />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{t.ticket_number}</TableCell>
                        <TableCell className="font-medium">{t.full_name}</TableCell>
                        <TableCell className="text-sm">{t.email}</TableCell>
                        <TableCell className="text-sm">{t.phone ?? "—"}</TableCell>
                        <TableCell>{se?.name ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline">{t.ticket_type}</Badge></TableCell>
                        <TableCell>${(se?.ticket_price ?? 0).toFixed(2)}</TableCell>
                        <TableCell>
                          {t.is_checked_in ? (
                            <Badge className="bg-green-600 text-white">Checked In</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(t.created_at), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">No tickets found</TableCell>
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
