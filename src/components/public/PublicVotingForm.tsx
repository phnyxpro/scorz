import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useVoteCounts, useMyVote, useCastVote } from "@/hooks/useAudienceVoting";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, CheckCircle, Users, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface PublicVotingFormProps {
  competitionId: string;
  levels: any[] | undefined;
}

function usePublicContestants(subEventId: string | undefined) {
  return useQuery({
    queryKey: ["public-voting-contestants", subEventId],
    enabled: !!subEventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contestant_registrations")
        .select("id, full_name, profile_photo_url, age_category")
        .eq("sub_event_id", subEventId!)
        .eq("status", "approved")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });
}

export function PublicVotingForm({ competitionId, levels }: PublicVotingFormProps) {
  const { user } = useAuth();
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [selectedSubEventId, setSelectedSubEventId] = useState("");
  const [selectedContestant, setSelectedContestant] = useState("");
  const [voterName, setVoterName] = useState("");
  const [voterEmail, setVoterEmail] = useState(user?.email || "");
  const [voterPhone, setVoterPhone] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");

  // Get sub-events for selected level
  const votableSubEvents = useMemo(() => {
    if (!selectedLevelId || !levels) return [];
    const level = levels.find(l => l.id === selectedLevelId);
    return (level?.sub_events || []).filter((se: any) => se.voting_enabled);
  }, [levels, selectedLevelId]);

  // Get all levels that have at least one votable sub-event
  const votableLevels = useMemo(() => {
    if (!levels) return [];
    return levels.filter(l =>
      l.sub_events?.some((se: any) => se.voting_enabled)
    );
  }, [levels]);

  const { data: contestants } = usePublicContestants(selectedSubEventId || undefined);
  const { data: voteCounts } = useVoteCounts(selectedSubEventId || undefined);
  const { data: myVote } = useMyVote(selectedSubEventId || undefined, voterEmail?.trim().toLowerCase() || undefined);
  const castVote = useCastVote();

  const totalVotes = useMemo(() => {
    if (!voteCounts) return 0;
    return Object.values(voteCounts).reduce((a, b) => a + b, 0);
  }, [voteCounts]);

  const hasVoted = !!myVote;

  const handleVote = () => {
    if (!selectedSubEventId || !selectedContestant || !voterName.trim() || !voterEmail.trim()) return;
    castVote.mutate({
      sub_event_id: selectedSubEventId,
      contestant_registration_id: selectedContestant,
      voter_name: voterName.trim(),
      voter_email: voterEmail.trim().toLowerCase(),
      voter_phone: voterPhone.trim() || undefined,
      ticket_number: ticketNumber.trim() || undefined,
    });
  };

  if (!votableLevels.length) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <Heart className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground">Voting is not open for any events yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-4">
        <Heart className="h-10 w-10 text-primary mx-auto mb-3" />
        <h2 className="text-2xl font-bold font-mono">People's Choice Awards</h2>
        <p className="text-muted-foreground text-sm mt-1">Vote for your favorite contestant!</p>
      </div>

      {/* Level / Sub-event selector */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Level</label>
              <Select value={selectedLevelId} onValueChange={(v) => { setSelectedLevelId(v); setSelectedSubEventId(""); setSelectedContestant(""); }}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  {votableLevels.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Event</label>
              <Select value={selectedSubEventId} onValueChange={(v) => { setSelectedSubEventId(v); setSelectedContestant(""); }}>
                <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                <SelectContent>
                  {votableSubEvents.map((se: any) => <SelectItem key={se.id} value={se.id}>{se.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedSubEventId && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Live tally */}
          {voteCounts && totalVotes > 0 && (
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" /> Live Tally
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(contestants || [])
                    .sort((a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0))
                    .filter(c => (voteCounts[c.id] || 0) > 0)
                    .map((c) => {
                      const count = voteCounts[c.id] || 0;
                      const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                      return (
                        <div key={c.id} className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground w-32 truncate">{c.full_name}</span>
                          <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary/80 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground w-16 text-right">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                      );
                    })}
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">{totalVotes} total votes</p>
              </CardContent>
            </Card>
          )}

          {/* Already voted */}
          {hasVoted ? (
            <Card className="border-secondary/30 bg-secondary/10">
              <CardContent className="flex flex-col items-center py-8">
                <CheckCircle className="h-10 w-10 text-secondary mb-3" />
                <p className="text-foreground font-medium">You've already voted!</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Voted for: {contestants?.find(r => r.id === myVote?.contestant_registration_id)?.full_name}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base">Cast Your Vote</CardTitle>
                <CardDescription>One vote per email per event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Contestant selector */}
                <div>
                  <label className="text-xs text-muted-foreground">Vote For *</label>
                  {contestants && contestants.length > 0 ? (
                    <div className="grid gap-2 mt-1">
                      {contestants.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedContestant(c.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                            selectedContestant === c.id
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-border/50 hover:bg-muted/30"
                          }`}
                        >
                          {c.profile_photo_url ? (
                            <img src={c.profile_photo_url} alt={c.full_name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <Users className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground">{c.full_name}</p>
                            <Badge variant="outline" className="text-[10px]">{c.age_category}</Badge>
                          </div>
                          {selectedContestant === c.id && <Heart className="h-4 w-4 text-primary ml-auto" />}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">No contestants available</p>
                  )}
                </div>

                {/* Voter info */}
                <div className="space-y-3 pt-2 border-t border-border/30">
                  <div>
                    <label className="text-xs text-muted-foreground">Your Name *</label>
                    <Input value={voterName} onChange={e => setVoterName(e.target.value)} placeholder="Full name" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Email *</label>
                    <Input type="email" value={voterEmail} onChange={e => setVoterEmail(e.target.value)} placeholder="email@example.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Phone</label>
                      <Input value={voterPhone} onChange={e => setVoterPhone(e.target.value)} placeholder="Optional" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Ticket / Seat #</label>
                      <Input value={ticketNumber} onChange={e => setTicketNumber(e.target.value)} placeholder="Optional" />
                    </div>
                  </div>
                </div>

                {!user ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                    <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      You need to <Link to="/auth" className="text-primary underline">sign in</Link> to submit your vote.
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={handleVote}
                    disabled={!selectedContestant || !voterName.trim() || !voterEmail.trim() || castVote.isPending}
                    className="w-full"
                  >
                    <Heart className="h-4 w-4 mr-1" />
                    {castVote.isPending ? "Submitting…" : "Cast Vote"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}
