import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useCompetition, useLevels, useSubEvents, useRubricCriteria } from "@/hooks/useCompetitions";
import { useRegistrations } from "@/hooks/useRegistrations";
import { useAllScoresForSubEvent, useCertification } from "@/hooks/useChiefJudge";
import { useTabulatorCertification } from "@/hooks/useTabulator";
import { useWitnessCertification } from "@/hooks/useWitness";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { ArrowLeft, Trophy, CheckCircle, Lock, Medal } from "lucide-react";
import { motion } from "framer-motion";

const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-700"];

export default function Results() {
  const { id: competitionId } = useParams<{ id: string }>();
  const { data: comp } = useCompetition(competitionId);
  const { data: levels } = useLevels(competitionId);
  const { data: rubric } = useRubricCriteria(competitionId);
  const { data: registrations } = useRegistrations(competitionId);

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

  const rubricNames = useMemo(() => rubric?.map((r) => r.name) ?? [], [rubric]);

  const contestantName = (regId: string) =>
    registrations?.find((r) => r.id === regId)?.full_name ?? "Unknown";

  // Compute leaderboard
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
            criterionAvgs[k] = (criterionAvgs[k] || 0) + v;
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
      regId: string;
      name: string;
      criterionAvgs: Record<string, number>;
      avgFinal: number;
      judgeCount: number;
    }[];
  }, [allScores, allCertified, registrations]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="icon">
          <Link to={`/competitions`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Results & Leaderboard</h1>
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

      {selectedSubEventId && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Certification chain status */}
          <div className="flex flex-wrap gap-2 mb-4">
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
                  Results are locked until all certifications are complete.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Chief Judge, Tabulator, and Witness must all sign off.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" /> Official Results
                </CardTitle>
                <CardDescription>Fully certified by all officials</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Rank</TableHead>
                        <TableHead>Contestant</TableHead>
                        {rubricNames.map((n) => (
                          <TableHead key={n} className="text-center text-xs">{n}</TableHead>
                        ))}
                        <TableHead className="text-center">Judges</TableHead>
                        <TableHead className="text-center font-bold">Final Avg</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((r, i) => (
                        <TableRow key={r.regId} className={i < 3 ? "bg-muted/20" : ""}>
                          <TableCell className="font-mono">
                            {i < 3 ? (
                              <Medal className={`h-5 w-5 inline ${medalColors[i]}`} />
                            ) : (
                              i + 1
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          {rubricNames.map((n) => (
                            <TableCell key={n} className="text-center font-mono text-xs">
                              {r.criterionAvgs[n] != null ? r.criterionAvgs[n].toFixed(2) : "—"}
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-mono text-xs">{r.judgeCount}</TableCell>
                          <TableCell className="text-center font-mono font-bold text-primary">
                            {r.avgFinal.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}
