import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompetitions, useLevels, useSubEvents, useRubricCriteria } from "@/hooks/useCompetitions";
import { useRegistrations } from "@/hooks/useRegistrations";
import { useAllScoresForSubEvent, useCertification } from "@/hooks/useChiefJudge";
import { useTabulatorCertification } from "@/hooks/useTabulator";
import { useWitnessCertification } from "@/hooks/useWitness";
import { useVoteCounts } from "@/hooks/useAudienceVoting";
import { PrintableResults } from "@/components/results/PrintableResults";
import { ScoreCardExporter } from "@/components/shared/ScoreCardExporter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { ArrowLeft, Trophy, CheckCircle, Lock, Medal, Heart } from "lucide-react";
import { motion } from "framer-motion";

const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-700"];

export default function ResultsHub() {
  const { hasRole } = useAuth();
  const canExport = hasRole("admin") || hasRole("organizer");
  const { data: competitions, isLoading: loadingComps } = useCompetitions();

  const [selectedCompId, setSelectedCompId] = useState("");
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [selectedSubEventId, setSelectedSubEventId] = useState("");

  const { data: levels } = useLevels(selectedCompId || undefined);
  const { data: rubric } = useRubricCriteria(selectedCompId || undefined);
  const { data: registrations } = useRegistrations(selectedCompId || undefined);
  const { data: subEvents } = useSubEvents(selectedLevelId || undefined);
  const { data: allScores } = useAllScoresForSubEvent(selectedSubEventId || undefined);
  const { data: chiefCert } = useCertification(selectedSubEventId || undefined);
  const { data: tabCert } = useTabulatorCertification(selectedSubEventId || undefined);
  const { data: witnessCert } = useWitnessCertification(selectedSubEventId || undefined);
  const { data: voteCounts } = useVoteCounts(selectedSubEventId || undefined);

  const comp = competitions?.find((c) => c.id === selectedCompId);
  const selectedSubEvent = subEvents?.find((se) => se.id === selectedSubEventId);

  // Auto-select first level when competition changes
  if (levels?.length && !selectedLevelId) setSelectedLevelId(levels[0].id);

  const allCertified =
    (chiefCert?.is_certified ?? false) &&
    (tabCert?.is_certified ?? false) &&
    (witnessCert?.is_certified ?? false);

  const sortedRubric = useMemo(() => [...(rubric ?? [])].sort((a, b) => a.sort_order - b.sort_order), [rubric]);
  const rubricNames = useMemo(() => sortedRubric.map((r) => r.name), [sortedRubric]);
  const indexToName = useMemo(() => {
    const map: Record<string, string> = {};
    sortedRubric.forEach((r, i) => { map[String(i)] = r.name; });
    return map;
  }, [sortedRubric]);

  const contestantName = (regId: string) =>
    registrations?.find((r) => r.id === regId)?.full_name ?? "Unknown";
  const contestantUserId = (regId: string) =>
    registrations?.find((r) => r.id === regId)?.user_id;

  const leaderboard = useMemo(() => {
    if (!allScores || !allCertified) return [];
    const map: Record<string, typeof allScores> = {};
    for (const s of allScores) {
      if (!map[s.contestant_registration_id]) map[s.contestant_registration_id] = [];
      map[s.contestant_registration_id].push(s);
    }
    return Object.entries(map)
      .map(([regId, scores]) => {
        const certified = scores.filter((s) => s.is_certified);
        if (certified.length === 0) return null;
        const criterionAvgs: Record<string, number> = {};
        for (const s of certified) {
          const cs = s.criterion_scores as Record<string, number>;
          for (const [k, v] of Object.entries(cs)) {
            const name = indexToName[k] ?? k;
            criterionAvgs[name] = (criterionAvgs[name] || 0) + v;
          }
        }
        for (const k of Object.keys(criterionAvgs)) {
          criterionAvgs[k] = criterionAvgs[k] / certified.length;
        }
        const avgFinal = certified.reduce((a, s) => a + s.final_score, 0) / certified.length;
        return { regId, name: contestantName(regId), criterionAvgs, avgFinal, judgeCount: certified.length };
      })
      .filter(Boolean)
      .sort((a, b) => b!.avgFinal - a!.avgFinal) as {
      regId: string; name: string; criterionAvgs: Record<string, number>; avgFinal: number; judgeCount: number;
    }[];
  }, [allScores, allCertified, registrations, indexToName]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Results & Leaderboard</h1>
          </div>
          <p className="text-muted-foreground text-xs">View certified results by competition</p>
        </div>
        {allCertified && leaderboard.length > 0 && canExport && (
          <PrintableResults
            competitionName={comp?.name || ""}
            subEventName={selectedSubEvent?.name || ""}
            leaderboard={leaderboard}
            rubricNames={rubricNames}
            certificationDates={{
              chiefJudge: chiefCert?.signed_at || undefined,
              tabulator: tabCert?.signed_at || undefined,
              witness: witnessCert?.signed_at || undefined,
            }}
            certificationSignatures={{
              chiefJudge: chiefCert?.chief_judge_signature,
              tabulator: tabCert?.tabulator_signature,
              witness: witnessCert?.witness_signature,
            }}
          />
        )}
      </div>

      {/* Competition + Level + Sub-event selectors */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="pt-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Competition</label>
            <Select value={selectedCompId} onValueChange={(v) => { setSelectedCompId(v); setSelectedLevelId(""); setSelectedSubEventId(""); }}>
              <SelectTrigger><SelectValue placeholder={loadingComps ? "Loading…" : "Select competition"} /></SelectTrigger>
              <SelectContent>
                {competitions?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {selectedCompId && (
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
          )}
        </CardContent>
      </Card>

      {selectedSubEventId && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant={chiefCert?.is_certified ? "secondary" : "outline"} className="gap-1">
              {chiefCert?.is_certified ? <CheckCircle className="h-3 w-3" /> : <Lock className="h-3 w-3" />} Chief Judge
            </Badge>
            <Badge variant={tabCert?.is_certified ? "secondary" : "outline"} className="gap-1">
              {tabCert?.is_certified ? <CheckCircle className="h-3 w-3" /> : <Lock className="h-3 w-3" />} Tabulator
            </Badge>
            <Badge variant={witnessCert?.is_certified ? "secondary" : "outline"} className="gap-1">
              {witnessCert?.is_certified ? <CheckCircle className="h-3 w-3" /> : <Lock className="h-3 w-3" />} Witness
            </Badge>
          </div>

          {!allCertified ? (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Lock className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm text-center">Results are locked until all certifications are complete.</p>
                <p className="text-xs text-muted-foreground mt-1">Chief Judge, Tabulator, and Witness must all sign off.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /> Official Results</CardTitle>
                <CardDescription>Fully certified by all officials</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Rank</TableHead>
                        <TableHead>Contestant</TableHead>
                        {rubricNames.map((n) => <TableHead key={n} className="text-center text-xs">{n}</TableHead>)}
                        <TableHead className="text-center">Judges</TableHead>
                        <TableHead className="text-center font-bold">Final Avg</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((r, i) => (
                        <TableRow key={r.regId} className={i < 3 ? "bg-muted/20" : ""}>
                          <TableCell className="font-mono">
                            {i < 3 ? <Medal className={`h-5 w-5 inline ${medalColors[i]}`} /> : i + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link to={`/profile/${contestantUserId(r.regId) || ""}`} className="hover:text-secondary hover:underline transition-colors">{r.name}</Link>
                          </TableCell>
                          {rubricNames.map((n) => (
                            <TableCell key={n} className="text-center font-mono text-xs">{r.criterionAvgs[n] != null ? r.criterionAvgs[n].toFixed(2) : "—"}</TableCell>
                          ))}
                          <TableCell className="text-center font-mono text-xs">{r.judgeCount}</TableCell>
                          <TableCell className="text-center font-mono font-bold text-primary">{r.avgFinal.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Score Card Export */}
          {canExport && (
            <ScoreCardExporter
              contestants={registrations?.filter(r => r.sub_event_id === selectedSubEventId) || []}
              subEventName={selectedSubEvent?.name || ""}
              competitionName={comp?.name || ""}
              judgeScores={allScores || []}
              availableJudges={[]} // Could be populated with actual judge data if needed
            />
          )}

          {voteCounts && Object.keys(voteCounts).length > 0 && (
            <Card className="border-border/50 bg-card/80 mt-4">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> People's Choice</CardTitle>
                <CardDescription>Audience voting results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(voteCounts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([regId, count], i) => {
                      const total = Object.values(voteCounts).reduce((a, b) => a + b, 0);
                      const pct = total > 0 ? (count / total) * 100 : 0;
                      return (
                        <div key={regId} className="flex items-center gap-3">
                          <span className="font-mono text-xs text-muted-foreground w-6">{i + 1}.</span>
                          <span className="text-sm font-medium text-foreground w-32 truncate">
                            <Link to={`/profile/${contestantUserId(regId) || ""}`} className="hover:text-secondary hover:underline transition-colors">{contestantName(regId)}</Link>
                          </span>
                          <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground w-16 text-right">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}
