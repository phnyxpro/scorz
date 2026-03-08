import { useState, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useAllScoresForSubEvent } from "@/hooks/useChiefJudge";
import { useJudgeScoresRealtime } from "@/hooks/useJudgeScores";
import { usePerformanceDurations, useDurationsRealtime, getAvgDuration } from "@/hooks/usePerformanceTimer";
import { useStaffDisplayNames } from "@/hooks/useStaffDisplayNames";
import { useRegistrations, useRegistrationsRealtime } from "@/hooks/useRegistrations";
import { useRubricCriteria } from "@/hooks/useCompetitions";
import { ScoreSummaryTable } from "@/components/tabulator/ScoreSummaryTable";
import { SideBySideScores } from "@/components/tabulator/SideBySideScores";
import { VoteAudit } from "@/components/tabulator/VoteAudit";
import { ConnectionIndicator } from "@/components/shared/ConnectionIndicator";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TableProperties } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function ScoreTablesPage() {
  const { id: competitionId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const subEventId = searchParams.get("sub_event") || "";

  const { data: subEvent } = useQuery({
    queryKey: ["sub_event_detail", subEventId],
    enabled: !!subEventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_events")
        .select("id, name, level_id")
        .eq("id", subEventId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: rubric } = useRubricCriteria(competitionId);
  const { data: registrations } = useRegistrations(competitionId);
  useRegistrationsRealtime(competitionId);

  const { data: allScores } = useAllScoresForSubEvent(subEventId || undefined);
  useJudgeScoresRealtime(subEventId || undefined);
  const { data: perfDurations } = usePerformanceDurations(subEventId || undefined);
  useDurationsRealtime(subEventId || undefined);

  const [selectedDetailRegId, setSelectedDetailRegId] = useState("");

  const rubricNames = useMemo(() => (rubric || []).map((r: any) => r.name), [rubric]);
  const indexToName = useMemo(() => {
    const m: Record<string, string> = {};
    (rubric || []).forEach((r: any, i: number) => { m[String(i)] = r.name; });
    return m;
  }, [rubric]);

  const scoresByContestant = useMemo(() => {
    if (!allScores) return {};
    const map: Record<string, typeof allScores> = {};
    for (const s of allScores) {
      if (!map[s.contestant_registration_id]) map[s.contestant_registration_id] = [];
      map[s.contestant_registration_id].push(s);
    }
    return map;
  }, [allScores]);

  const judgeIds = useMemo(() => [...new Set((allScores || []).map(s => s.judge_id))], [allScores]);
  const staffNameMap = useStaffDisplayNames(judgeIds);
  const judgeProfiles = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [uid, name] of staffNameMap.entries()) m[uid] = name;
    return m;
  }, [staffNameMap]);

  const contestantMap = useMemo(() => {
    const m = new Map<string, any>();
    (registrations || []).forEach((r: any) => m.set(r.id, r));
    return m;
  }, [registrations]);
  const contestantName = (regId: string) => contestantMap.get(regId)?.full_name ?? "Unknown";
  const contestantUserId = (regId: string) => contestantMap.get(regId)?.user_id;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link to={`/competitions/${competitionId}/tabulator`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <TableProperties className="h-5 w-5 text-primary" />
            Score Tables
            <ConnectionIndicator />
          </h1>
          {subEvent && (
            <p className="text-muted-foreground text-sm">{subEvent.name}</p>
          )}
        </div>
      </div>

      {!subEventId ? (
        <Card className="border-border/50 bg-card/80">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No sub-event selected. Go back to the Tabulator Dashboard and select a sub-event.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList>
            <TabsTrigger value="summary">Score Summary</TabsTrigger>
            <TabsTrigger value="detail">Side-by-Side Detail</TabsTrigger>
            <TabsTrigger value="votes">Vote Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <Card className="border-border/50 bg-card/80">
              <CardContent className="pt-4">
                <ScoreSummaryTable
                  scoresByContestant={scoresByContestant}
                  contestantName={contestantName}
                  contestantUserId={contestantUserId}
                  rubricNames={rubricNames}
                  indexToName={indexToName}
                  durations={perfDurations}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detail">
            <div className="space-y-4">
              <Select value={selectedDetailRegId} onValueChange={setSelectedDetailRegId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a contestant…" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(scoresByContestant).map((regId) => (
                    <SelectItem key={regId} value={regId}>{contestantName(regId)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDetailRegId && scoresByContestant[selectedDetailRegId] && (
                <Card className="border-border/50 bg-card/80">
                  <CardContent className="pt-4">
                    <SideBySideScores
                      scores={scoresByContestant[selectedDetailRegId]}
                      rubricNames={rubricNames}
                      indexToName={indexToName}
                      contestantName={contestantName(selectedDetailRegId)}
                      contestantUserId={contestantUserId(selectedDetailRegId)}
                      judgeProfiles={judgeProfiles}
                      durationSeconds={perfDurations ? getAvgDuration(perfDurations, selectedDetailRegId) : undefined}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="votes">
            <VoteAudit subEventId={subEventId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
