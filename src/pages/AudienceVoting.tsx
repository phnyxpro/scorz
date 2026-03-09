import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompetition, useLevels, useSubEvents } from "@/hooks/useCompetitions";
import { useRegistrations } from "@/hooks/useRegistrations";
import { useVoteCounts, useMyVote, useCastVote } from "@/hooks/useAudienceVoting";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Heart, CheckCircle, Users } from "lucide-react";
import { motion } from "framer-motion";

/** Fetch all votes cast by a specific email across a competition's sub-events */
function useMyVotesForCompetition(competitionId: string | undefined, email: string | undefined) {
  return useQuery({
    queryKey: ["my-competition-votes", competitionId, email],
    enabled: !!competitionId && !!email,
    queryFn: async () => {
      // Get all sub-event IDs for this competition
      const { data: levels } = await supabase
        .from("competition_levels")
        .select("id")
        .eq("competition_id", competitionId!);
      if (!levels?.length) return [];
      const { data: subs } = await supabase
        .from("sub_events")
        .select("id, name, level_id, voting_enabled")
        .in("level_id", levels.map(l => l.id));
      if (!subs?.length) return [];

      const { data: votes } = await supabase
        .from("audience_votes")
        .select("*, contestant_registrations!audience_votes_contestant_registration_id_fkey(full_name)")
        .in("sub_event_id", subs.map(s => s.id))
        .eq("voter_email", email!);

      return (votes || []).map(v => ({
        ...v,
        sub_event_name: subs.find(s => s.id === v.sub_event_id)?.name || "Event",
        contestant_name: (v as any).contestant_registrations?.full_name || "Unknown",
      }));
    },
  });
}

export default function AudienceVoting() {
  const { id: competitionId } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: comp } = useCompetition(competitionId);
  const { data: levels } = useLevels(competitionId);
  const { data: registrations } = useRegistrations(competitionId);
  const { data: myVotes, isLoading: votesLoading } = useMyVotesForCompetition(competitionId, user?.email || undefined);

  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [selectedSubEventId, setSelectedSubEventId] = useState("");
  const [selectedContestant, setSelectedContestant] = useState("");
  const [voterName, setVoterName] = useState("");
  const [voterEmail, setVoterEmail] = useState(user?.email || "");
  const [voterPhone, setVoterPhone] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");

  if (levels?.length && !selectedLevelId) setSelectedLevelId(levels[0].id);

  const { data: subEvents } = useSubEvents(selectedLevelId || undefined);
  const { data: voteCounts } = useVoteCounts(selectedSubEventId || undefined);
  const { data: myVote } = useMyVote(selectedSubEventId || undefined, voterEmail || undefined);
  const castVote = useCastVote();

  // Sub-events where voting is enabled and user hasn't voted
  const votedSubEventIds = new Set((myVotes || []).map(v => v.sub_event_id));
  const openSubEvents = useMemo(() => {
    return (subEvents || []).filter(
      se => (se as any).voting_enabled && !votedSubEventIds.has(se.id)
    );
  }, [subEvents, votedSubEventIds]);

  const contestants = useMemo(() => {
    if (!registrations || !selectedSubEventId) return [];
    return registrations.filter(
      (r) => r.status !== "rejected" && (r.sub_event_id === selectedSubEventId || !r.sub_event_id)
    );
  }, [registrations, selectedSubEventId]);

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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">People's Choice</h1>
          </div>
          <p className="text-muted-foreground text-xs">{comp?.name}</p>
        </div>
      </div>

      {/* My existing votes */}
      {myVotes && myVotes.length > 0 && (
        <Card className="border-secondary/30 bg-secondary/5 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-secondary" /> Your Votes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myVotes.map(v => (
                <div key={v.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/10">
                  <div>
                    <p className="text-sm font-medium text-foreground">{v.sub_event_name}</p>
                    <p className="text-xs text-muted-foreground">Voted for: {v.contestant_name}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">Voted</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {votesLoading ? (
        <p className="text-sm text-muted-foreground animate-pulse text-center py-8">Loading your votes…</p>
      ) : (
        <>
          {/* Voting form for events not yet voted on */}
          <Card className="border-border/50 bg-card/80 mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cast a Vote</CardTitle>
              <CardDescription className="text-xs">Select an event where voting is open</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Level</label>
                  <Select value={selectedLevelId} onValueChange={(v) => { setSelectedLevelId(v); setSelectedSubEventId(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {levels?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Event</label>
                  <Select value={selectedSubEventId} onValueChange={setSelectedSubEventId}>
                    <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                    <SelectContent>
                      {openSubEvents.map(se => <SelectItem key={se.id} value={se.id}>{se.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedSubEventId && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {hasVoted ? (
                <Card className="border-secondary/30 bg-secondary/10">
                  <CardContent className="flex flex-col items-center py-8">
                    <CheckCircle className="h-10 w-10 text-secondary mb-3" />
                    <p className="text-foreground font-medium">You've already voted for this event!</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-border/50 bg-card/80">
                  <CardContent className="pt-4 space-y-3">
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
                    <div>
                      <label className="text-xs text-muted-foreground">Vote For *</label>
                      <Select value={selectedContestant} onValueChange={setSelectedContestant}>
                        <SelectTrigger><SelectValue placeholder="Select contestant" /></SelectTrigger>
                        <SelectContent>
                          {contestants.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleVote}
                      disabled={!selectedContestant || !voterName.trim() || !voterEmail.trim() || castVote.isPending}
                      className="w-full"
                    >
                      <Heart className="h-4 w-4 mr-1" />
                      {castVote.isPending ? "Submitting…" : "Cast Vote"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {!selectedSubEventId && openSubEvents.length === 0 && (
            <div className="text-center py-8">
              <Heart className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {myVotes && myVotes.length > 0
                  ? "You've voted in all open events. Thank you!"
                  : "No events with voting open right now."}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
