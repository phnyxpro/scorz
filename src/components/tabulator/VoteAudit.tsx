import { useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Trash2, Ticket } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  subEventId: string;
}

function useAudienceVotes(subEventId: string | undefined) {
  return useQuery({
    queryKey: ["audience-votes-audit", subEventId],
    enabled: !!subEventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audience_votes")
        .select("*")
        .eq("sub_event_id", subEventId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function VoteAudit({ subEventId }: Props) {
  const { data: votes, isLoading } = useAudienceVotes(subEventId);
  const qc = useQueryClient();

  // Realtime subscription for audience_votes
  useEffect(() => {
    if (!subEventId) return;
    const channel = supabase
      .channel(`vote-audit-${subEventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "audience_votes", filter: `sub_event_id=eq.${subEventId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["audience-votes-audit", subEventId] });
          qc.invalidateQueries({ queryKey: ["vote_counts", subEventId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [subEventId, qc]);

  const duplicates = useMemo(() => {
    if (!votes) return new Set<string>();
    const ticketCounts: Record<string, number> = {};
    votes.forEach(v => {
      if (v.ticket_number) {
        ticketCounts[v.ticket_number] = (ticketCounts[v.ticket_number] || 0) + 1;
      }
    });
    return new Set(Object.entries(ticketCounts).filter(([, c]) => c > 1).map(([t]) => t));
  }, [votes]);

  const handleDelete = async (voteId: string) => {
    const { error } = await supabase.from("audience_votes").delete().eq("id", voteId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vote removed" });
      qc.invalidateQueries({ queryKey: ["audience-votes-audit", subEventId] });
    }
  };

  if (isLoading) return <div className="text-muted-foreground text-sm animate-pulse p-4">Loading votes…</div>;

  const totalVotes = votes?.length || 0;
  const duplicateTickets = duplicates.size;

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Ticket className="h-4 w-4 text-primary" /> Audience Vote Audit
        </CardTitle>
        <CardDescription>
          {totalVotes} votes · {duplicateTickets} duplicate ticket{duplicateTickets !== 1 ? "s" : ""} detected
        </CardDescription>
      </CardHeader>
      <CardContent>
        {duplicateTickets > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 mb-4">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-xs text-foreground">
              {duplicateTickets} ticket number{duplicateTickets !== 1 ? "s" : ""} used more than once. Review and remove invalid votes.
            </p>
          </div>
        )}

        {totalVotes === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No audience votes recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Voter</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Ticket #</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {votes?.map(v => {
                  const isDup = v.ticket_number ? duplicates.has(v.ticket_number) : false;
                  return (
                    <TableRow key={v.id} className={isDup ? "bg-destructive/5" : ""}>
                      <TableCell className="text-sm">{v.voter_name}</TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">{v.voter_email}</TableCell>
                      <TableCell className="text-sm font-mono">{v.ticket_number || "—"}</TableCell>
                      <TableCell>
                        {isDup ? (
                          <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">
                            Duplicate
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-secondary/20 text-secondary border-secondary/30 text-[10px]">
                            Valid
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(v.id)}
                          title="Remove vote"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
