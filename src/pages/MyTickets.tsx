import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ticket, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

interface TicketRow {
  id: string;
  ticket_number: string;
  ticket_type: string;
  full_name: string;
  email: string;
  is_checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
  sub_events: {
    name: string;
    event_date: string | null;
    competition_levels: {
      name: string;
      competitions: {
        id: string;
        name: string;
      };
    };
  };
}

export default function MyTickets() {
  const { user } = useAuth();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["my-tickets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Try fetching by user_id first, then fallback to email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", user!.id)
        .single();

      const { data, error } = await supabase
        .from("event_tickets")
        .select(`
          id, ticket_number, ticket_type, full_name, email, is_checked_in, checked_in_at, created_at,
          sub_events!inner (
            name, event_date,
            competition_levels:level_id!inner (
              name,
              competitions:competition_id!inner ( id, name )
            )
          )
        `)
        .or(`user_id.eq.${user!.id}${profile?.email ? `,email.eq.${profile.email}` : ""}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as TicketRow[];
    },
  });

  // Group tickets by competition
  const grouped = (tickets ?? []).reduce<Record<string, { compName: string; tickets: TicketRow[] }>>((acc, t) => {
    const comp = t.sub_events.competition_levels.competitions;
    if (!acc[comp.id]) acc[comp.id] = { compName: comp.name, tickets: [] };
    acc[comp.id].tickets.push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">My Tickets</h1>
        <p className="text-muted-foreground text-sm">Your event tickets and check-in status</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : Object.keys(grouped).length > 0 ? (
        Object.entries(grouped).map(([compId, { compName, tickets: compTickets }]) => (
          <Card key={compId} className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-mono">{compName}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compTickets.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.ticket_number}</TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{t.sub_events.name}</div>
                        <div className="text-xs text-muted-foreground">{t.sub_events.competition_levels.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{t.ticket_type}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.sub_events.event_date
                          ? format(new Date(t.sub_events.event_date), "MMM d, yyyy")
                          : format(new Date(t.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {t.is_checked_in ? (
                          <span className="flex items-center gap-1 text-xs text-primary">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Checked In
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" /> Pending
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="text-center py-16">
          <Ticket className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No tickets yet.</p>
          <p className="text-muted-foreground text-sm">Browse events to get your tickets!</p>
        </div>
      )}
    </div>
  );
}
