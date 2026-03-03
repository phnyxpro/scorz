import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompetition, useLevels, useSubEvents, useRubricCriteria } from "@/hooks/useCompetitions";
import { useMyRegistration } from "@/hooks/useRegistrations";
import { useAllScoresForSubEvent, useCertification } from "@/hooks/useChiefJudge";
import { useTabulatorCertification } from "@/hooks/useTabulator";
import { useWitnessCertification } from "@/hooks/useWitness";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Award, CheckCircle, Lock, MessageSquare, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { PrintableScorecard } from "@/components/results/PrintableScorecard";
import type { JudgeScore } from "@/hooks/useJudgeScores";

export default function PostEventPortal() {
  const { id: competitionId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: comp } = useCompetition(competitionId);
  const { data: levels } = useLevels(competitionId);
  const { data: myReg } = useMyRegistration(competitionId);
  const { data: rubric } = useRubricCriteria(competitionId);

  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [selectedSubEventId, setSelectedSubEventId] = useState("");

  if (levels?.length && !selectedLevelId) setSelectedLevelId(levels[0].id);

  const { data: subEvents } = useSubEvents(selectedLevelId || undefined);
  const { data: allScores } = useAllScoresForSubEvent(selectedSubEventId || undefined);
  const { data: chiefCert } = useCertification(selectedSubEventId || undefined);
  const { data: tabCert } = useTabulatorCertification(selectedSubEventId || undefined);
  const { data: witnessCert } = useWitnessCertification(selectedSubEventId || undefined);

  const allCertified =
    (chiefCert?.is_certified ?? false) &&
    (tabCert?.is_certified ?? false) &&
    (witnessCert?.is_certified ?? false);

  // Sorted rubric for index mapping
  const sortedRubric = useMemo(() => [...(rubric ?? [])].sort((a, b) => a.sort_order - b.sort_order), [rubric]);
  const indexToName = useMemo(() => {
    const map: Record<string, string> = {};
    sortedRubric.forEach((r, i) => { map[String(i)] = r.name; });
    return map;
  }, [sortedRubric]);

  // Filter scores for current contestant only
  const myScores = useMemo(() => {
    if (!allScores || !myReg) return [];
    return allScores.filter((s) => s.contestant_registration_id === myReg.id);
  }, [allScores, myReg]);

  const certifiedScores = useMemo(() => myScores.filter((s) => s.is_certified), [myScores]);

  // Compute averages per criterion
  const criterionAverages = useMemo(() => {
    if (certifiedScores.length === 0) return {};
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const s of certifiedScores) {
      const cs = s.criterion_scores as Record<string, number>;
      for (const [k, v] of Object.entries(cs)) {
        const name = indexToName[k] ?? k;
        sums[name] = (sums[name] || 0) + v;
        counts[name] = (counts[name] || 0) + 1;
      }
    }
    const avgs: Record<string, number> = {};
    for (const k of Object.keys(sums)) {
      avgs[k] = sums[k] / counts[k];
    }
    return avgs;
  }, [certifiedScores, indexToName]);

  const overallAvg = certifiedScores.length > 0
    ? certifiedScores.reduce((a, s) => a + s.final_score, 0) / certifiedScores.length
    : 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="icon">
          <Link to={`/competitions/${competitionId}/results`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Post-Event Portal</h1>
          </div>
          <p className="text-muted-foreground text-xs">{comp?.name} — {myReg?.full_name}</p>
        </div>
        {allCertified && certifiedScores.length > 0 && (
          <PrintableScorecard
            competitionName={comp?.name || ""}
            subEventName={subEvents?.find(se => se.id === selectedSubEventId)?.name || ""}
            contestantName={myReg?.full_name || ""}
            scores={certifiedScores}
            sortedRubric={sortedRubric}
            indexToName={indexToName}
            overallAvg={overallAvg}
            criterionAverages={criterionAverages}
          />
        )}
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

      {selectedSubEventId && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Certification status */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={chiefCert?.is_certified ? "secondary" : "outline"} className="gap-1">
              {chiefCert?.is_certified ? <CheckCircle className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              Chief Judge
            </Badge>
            <Badge variant={tabCert?.is_certified ? "secondary" : "outline"} className="gap-1">
              {tabCert?.is_certified ? <CheckCircle className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              Tabulator
            </Badge>
            <Badge variant={witnessCert?.is_certified ? "secondary" : "outline"} className="gap-1">
              {witnessCert?.is_certified ? <CheckCircle className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              Witness
            </Badge>
          </div>

          {!allCertified ? (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Lock className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm text-center">
                  Your detailed feedback will be available once all certifications are complete.
                </p>
              </CardContent>
            </Card>
          ) : certifiedScores.length === 0 ? (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm text-center">
                  No scores found for this sub-event.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Score overview */}
              <Card className="border-border/50 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" /> Score Overview
                  </CardTitle>
                  <CardDescription>
                    Averaged across {certifiedScores.length} judge{certifiedScores.length > 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Overall final average */}
                  <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <span className="text-sm font-medium text-foreground">Overall Final Average</span>
                    <span className="text-2xl font-bold text-primary font-mono">{overallAvg.toFixed(2)}</span>
                  </div>

                  {/* Criterion breakdown */}
                  <div className="space-y-3">
                    {sortedRubric.map((criterion) => {
                      const avg = criterionAverages[criterion.name];
                      const pct = avg != null ? (avg / 5) * 100 : 0;
                      return (
                        <div key={criterion.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-foreground font-medium">{criterion.name}</span>
                            <span className="text-muted-foreground font-mono">
                              {avg != null ? avg.toFixed(2) : "—"} / 5.00
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary/70 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Individual judge feedback */}
              <Card className="border-border/50 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" /> Judge Feedback
                  </CardTitle>
                  <CardDescription>Individual scores and comments from each judge</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {certifiedScores.map((score, idx) => (
                    <JudgeFeedbackCard
                      key={score.id}
                      score={score}
                      judgeNumber={idx + 1}
                      sortedRubric={sortedRubric}
                      indexToName={indexToName}
                    />
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}

function JudgeFeedbackCard({
  score,
  judgeNumber,
  sortedRubric,
  indexToName,
}: {
  score: JudgeScore;
  judgeNumber: number;
  sortedRubric: { id: string; name: string }[];
  indexToName: Record<string, string>;
}) {
  const cs = score.criterion_scores as Record<string, number>;
  // Remap numeric indices
  const mapped: Record<string, number> = {};
  for (const [k, v] of Object.entries(cs)) {
    mapped[indexToName[k] ?? k] = v;
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">Judge #{judgeNumber}</Badge>
        <span className="text-sm font-mono font-bold text-primary">{score.final_score.toFixed(2)}</span>
      </div>

      {/* Criterion scores */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {sortedRubric.map((criterion) => (
          <div key={criterion.id} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{criterion.name}</span>
            <span className="font-mono text-foreground">{mapped[criterion.name] ?? "—"}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Raw: <span className="font-mono text-foreground">{score.raw_total}</span></span>
        {score.time_penalty > 0 && (
          <span>Penalty: <span className="font-mono text-destructive">-{score.time_penalty}</span></span>
        )}
      </div>

      {/* Comments */}
      {score.comments && (
        <>
          <Separator />
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Comments</p>
            <p className="text-sm text-foreground leading-relaxed">{score.comments}</p>
          </div>
        </>
      )}
    </div>
  );
}
