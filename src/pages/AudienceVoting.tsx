import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompetition, useLevels, useSubEvents } from "@/hooks/useCompetitions";
import { useRegistrations } from "@/hooks/useRegistrations";
import { useVoteCounts, useMyVote, useCastVote } from "@/hooks/useAudienceVoting";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Heart, CheckCircle, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function AudienceVoting() {
  const { id: competitionId } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: comp } = useCompetition(competitionId);
  const { data: levels } = useLevels(competitionId);
  const { data: registrations } = useRegistrations(competitionId);

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

  const contestants = useMemo(() => {
    if (!registrations || !selectedSubEventId) return [];
    return registrations.filter(
      (r) => r.status !== "rejected" && (r.sub_event_id === selectedSubEventId || !r.sub_event_id)
    );
  }, [registrations, selectedSubEventId]);

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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="icon">
          <Link to={`/competitions`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">People's Choice</h1>
          </div>
          <p className="text-muted-foreground text-xs">{comp?.name}</p>
        </div>
      </div>

      {/* Sub-event selector */}
      <Card className="border-border/50 bg-card/80 mb-4">
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
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
        </CardContent>
      </Card>

      {selectedSubEventId && (() => {
        const selectedSub = subEvents?.find(se => se.id === selectedSubEventId);
        const votingOpen = (selectedSub as any)?.voting_enabled;
        return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {!votingOpen && (
            <Card className="border-border/50 bg-muted/30">
              <CardContent className="flex flex-col items-center py-8">
                <Heart className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-foreground font-medium">Voting is not open yet</p>
                <p className="text-muted-foreground text-xs mt-1">The organiser has not activated voting for this event.</p>
              </CardContent>
            </Card>
          )}
          {/* Vote counts */}
          {voteCounts && totalVotes > 0 && (
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" /> Live Vote Tally
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {contestants
                    .sort((a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0))
                    .map((c) => {
                      const count = voteCounts[c.id] || 0;
                      const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                      return (
                        <div key={c.id} className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground w-32 truncate">{c.full_name}</span>
                          <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary/80 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground w-12 text-right">
                            {count} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                      );
                    })}
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">{totalVotes} total votes</p>
              </CardContent>
            </Card>
          )}

          {/* Voting form or confirmation */}
          {votingOpen && (hasVoted ? (
            <Card className="border-secondary/30 bg-secondary/10">
              <CardContent className="flex flex-col items-center py-8">
                <CheckCircle className="h-10 w-10 text-secondary mb-3" />
                <p className="text-foreground font-medium">You've already voted!</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Voted for: {registrations?.find((r) => r.id === myVote?.contestant_registration_id)?.full_name}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base">Cast Your Vote</CardTitle>
                <CardDescription>One vote per person per sub-event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Your Name *</label>
                  <Input value={voterName} onChange={(e) => setVoterName(e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email *</label>
                  <Input type="email" value={voterEmail} onChange={(e) => setVoterEmail(e.target.value)} placeholder="email@example.com" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Phone</label>
                    <Input value={voterPhone} onChange={(e) => setVoterPhone(e.target.value)} placeholder="Optional" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Ticket / Seat #</label>
                    <Input value={ticketNumber} onChange={(e) => setTicketNumber(e.target.value)} placeholder="Optional" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Vote For *</label>
                  <Select value={selectedContestant} onValueChange={setSelectedContestant}>
                    <SelectTrigger><SelectValue placeholder="Select contestant" /></SelectTrigger>
                    <SelectContent>
                      {contestants.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                      ))}
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
          ))}
        </motion.div>
        );
      })()}
    </div>
  );
}
