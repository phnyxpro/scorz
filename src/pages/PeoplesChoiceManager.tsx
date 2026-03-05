import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompetitions, useLevels } from "@/hooks/useCompetitions";
import { useVoteCounts } from "@/hooks/useAudienceVoting";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { VoteAudit } from "@/components/tabulator/VoteAudit";
import { Mic, Vote, Users, TrendingUp, ChevronDown, BarChart3, ShieldCheck } from "lucide-react";

// Fetch all sub-events for a competition across all levels
function useCompetitionSubEvents(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["competition-sub-events", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const { data: levels, error: le } = await supabase
        .from("competition_levels")
        .select("id, name")
        .eq("competition_id", competitionId!);
      if (le) throw le;
      if (!levels?.length) return [];

      const { data: subs, error: se } = await supabase
        .from("sub_events")
        .select("*")
        .in("level_id", levels.map(l => l.id))
        .order("event_date");
      if (se) throw se;

      return (subs || []).map(s => ({
        ...s,
        levelName: levels.find(l => l.id === s.level_id)?.name || "",
      }));
    },
  });
}

// Fetch registrations for vote contestant name lookups
function useContestantNames(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["contestant-names", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contestant_registrations")
        .select("id, full_name, profile_photo_url")
        .eq("competition_id", competitionId!)
        .eq("status", "approved");
      if (error) throw error;
      const map: Record<string, { name: string; photo: string | null }> = {};
      (data || []).forEach(r => { map[r.id] = { name: r.full_name, photo: r.profile_photo_url }; });
      return map;
    },
  });
}

function SubEventVoteCard({ subEvent, competitionId }: { subEvent: any; competitionId: string }) {
  const { data: voteCounts, isLoading } = useVoteCounts(subEvent.id);
  const { data: contestants } = useContestantNames(competitionId);
  const [auditOpen, setAuditOpen] = useState(false);
  const qc = useQueryClient();

  const toggleSubEventVoting = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("sub_events")
        .update({ voting_enabled: enabled })
        .eq("id", subEvent.id);
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      qc.invalidateQueries({ queryKey: ["competition-sub-events"] });
      toast({ title: enabled ? "Voting activated for " + subEvent.name : "Voting deactivated for " + subEvent.name });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const ranked = useMemo(() => {
    if (!voteCounts) return [];
    return Object.entries(voteCounts)
      .map(([regId, count]) => ({
        regId,
        count,
        name: contestants?.[regId]?.name || "Unknown",
      }))
      .sort((a, b) => b.count - a.count);
  }, [voteCounts, contestants]);

  const totalVotes = ranked.reduce((s, r) => s + r.count, 0);
  const maxVotes = ranked[0]?.count || 1;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">{subEvent.name}</CardTitle>
            <CardDescription className="text-xs">
              {subEvent.levelName} · {subEvent.event_date || "No date"} · {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          {ranked[0] && (
            <Badge variant="secondary" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              {ranked[0].name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground animate-pulse">Loading votes…</p>
        ) : ranked.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No votes yet</p>
        ) : (
          <div className="space-y-2">
            {ranked.map((r, i) => {
              const pct = totalVotes > 0 ? Math.round((r.count / totalVotes) * 100) : 0;
              return (
                <div key={r.regId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium truncate max-w-[60%]">
                      {i === 0 && "🏆 "}{r.name}
                    </span>
                    <span className="text-muted-foreground">{r.count} ({pct}%)</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </div>
        )}

        <Collapsible open={auditOpen} onOpenChange={setAuditOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-2">
            <ShieldCheck className="h-3 w-3" />
            Vote Audit
            <ChevronDown className={`h-3 w-3 transition-transform ${auditOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <VoteAudit subEventId={subEvent.id} />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export default function PeoplesChoiceManager() {
  const { data: competitions, isLoading: compsLoading } = useCompetitions();
  const [selectedCompId, setSelectedCompId] = useState<string>("");
  const qc = useQueryClient();

  const selectedComp = useMemo(
    () => competitions?.find(c => c.id === selectedCompId),
    [competitions, selectedCompId]
  );

  // Fetch full competition row to get voting_enabled
  const { data: compFull } = useQuery({
    queryKey: ["competition-full", selectedCompId],
    enabled: !!selectedCompId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("id, voting_enabled")
        .eq("id", selectedCompId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: subEvents, isLoading: subsLoading } = useCompetitionSubEvents(selectedCompId || undefined);

  const toggleVoting = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("competitions")
        .update({ voting_enabled: enabled })
        .eq("id", selectedCompId);
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      qc.invalidateQueries({ queryKey: ["competition-full", selectedCompId] });
      toast({ title: enabled ? "Voting activated" : "Voting deactivated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Aggregate stats
  const totalSubEvents = subEvents?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mic className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">People's Choice</h1>
            <p className="text-sm text-muted-foreground">Manage audience voting & view live results</p>
          </div>
        </div>
      </div>

      {/* Competition Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1.5 block">Select Competition</label>
              <Select value={selectedCompId} onValueChange={setSelectedCompId}>
                <SelectTrigger>
                  <SelectValue placeholder={compsLoading ? "Loading…" : "Choose a competition"} />
                </SelectTrigger>
                <SelectContent>
                  {competitions?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCompId && compFull && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <div className="text-sm font-medium">Audience Voting</div>
                <Switch
                  checked={compFull.voting_enabled}
                  onCheckedChange={(checked) => toggleVoting.mutate(checked)}
                  disabled={toggleVoting.isPending}
                />
                <Badge variant={compFull.voting_enabled ? "default" : "secondary"} className="text-xs">
                  {compFull.voting_enabled ? "Active" : "Off"}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {!selectedCompId ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Vote className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Select a competition to manage audience voting</p>
          </CardContent>
        </Card>
      ) : subsLoading ? (
        <div className="text-sm text-muted-foreground animate-pulse p-8 text-center">Loading sub-events…</div>
      ) : !subEvents?.length ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">No sub-events found for this competition</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            {totalSubEvents} sub-event{totalSubEvents !== 1 ? "s" : ""} · Live tallies refresh every 15s
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {subEvents.map(se => (
              <SubEventVoteCard key={se.id} subEvent={se} competitionId={selectedCompId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
