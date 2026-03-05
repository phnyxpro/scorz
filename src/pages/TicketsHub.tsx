import { useState, useMemo } from "react";
import { useCompetitions } from "@/hooks/useCompetitions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Search, Ticket, CheckCircle2, Clock, DollarSign, Mail, Phone, Send } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { ExportDropdown } from "@/components/shared/ExportDropdown";

type TicketRow = Tables<"event_tickets">;

export default function TicketsHub() {
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const { data: competitions } = useCompetitions();

  const sendTicketEmail = useMutation({
    mutationFn: async (ticketId: string) => {
      const { data, error } = await supabase.functions.invoke("send-ticket-email", {
        body: { ticket_id: ticketId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Ticket sent!", description: "Email with ticket and QR code has been sent." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    },
  });

  const handleSendAll = async () => {
    if (!filtered.length) return;
    setSendingAll(true);
    let sent = 0;
    let failed = 0;
    for (const t of filtered) {
      try {
        await supabase.functions.invoke("send-ticket-email", { body: { ticket_id: t.id } });
        sent++;
      } catch {
        failed++;
      }
    }
    setSendingAll(false);
    toast({
      title: "Bulk send complete",
      description: `${sent} sent, ${failed} failed out of ${filtered.length} tickets.`,
    });
  };

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

  const exportRows = useMemo(() => {
    return filtered.map((t) => {
      const se = subEventMap[t.sub_event_id];
      return {
        "Ticket #": t.ticket_number,
        "Name": t.full_name,
        "Email": t.email,
        "Phone": t.phone ?? "",
        "Sub-Event": se?.name ?? "",
        "Type": t.ticket_type,
        "Price": `$${(se?.ticket_price ?? 0).toFixed(2)}`,
        "Status": t.is_checked_in ? "Checked In" : "Pending",
        "Checked In At": t.checked_in_at ? format(new Date(t.checked_in_at), "MMM d, yyyy h:mm a") : "",
        "Purchased": format(new Date(t.created_at), "MMM d, yyyy h:mm a"),
      };
    });
  }, [filtered, subEventMap]);

  const selectedSe = selectedTicket ? subEventMap[selectedTicket.sub_event_id] : null;

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

          {/* Search + Export */}
          <div className="flex items-center gap-3">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name, email, or ticket #…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <ExportDropdown rows={exportRows} filename="ticket-sales" sheetName="Tickets" />
            <Button
              variant="outline"
              size="sm"
              disabled={sendingAll || filtered.length === 0}
              onClick={handleSendAll}
            >
              <Send className="h-4 w-4 mr-1.5" />
              {sendingAll ? "Sending…" : "Send All"}
            </Button>
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
                      <TableRow
                        key={t.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedTicket(t)}
                      >
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

      {/* Ticket Detail Sheet */}
      <Sheet open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedTicket && (
            <>
              <SheetHeader>
                <SheetTitle>Ticket Details</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* QR Code */}
                <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <QRCodeSVG value={selectedTicket.ticket_number} size={180} />
                  <p className="font-mono text-sm font-semibold tracking-wider">{selectedTicket.ticket_number}</p>
                </div>

                {/* Status */}
                <div className="flex justify-center">
                  {selectedTicket.is_checked_in ? (
                    <Badge className="bg-green-600 text-white text-sm px-4 py-1">Checked In</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-sm px-4 py-1">Pending</Badge>
                  )}
                </div>

                <Separator />

                {/* Purchaser Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Purchaser</h3>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold">{selectedTicket.full_name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{selectedTicket.email}</span>
                    </div>
                    {selectedTicket.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{selectedTicket.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Event & Ticket Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Event & Ticket</h3>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Sub-Event</p>
                      <p className="font-medium">{selectedSe?.name ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ticket Type</p>
                      <p className="font-medium capitalize">{selectedTicket.ticket_type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Price</p>
                      <p className="font-medium">${(selectedSe?.ticket_price ?? 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Purchased</p>
                      <p className="font-medium">{format(new Date(selectedTicket.created_at), "MMM d, yyyy h:mm a")}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Check-In History */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Check-In History</h3>
                  {selectedTicket.is_checked_in && selectedTicket.checked_in_at ? (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">Checked in</p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {format(new Date(selectedTicket.checked_in_at), "EEEE, MMM d, yyyy 'at' h:mm:ss a")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">Not yet checked in</p>
                        <p className="text-sm text-muted-foreground">Patron has not arrived or been scanned.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}