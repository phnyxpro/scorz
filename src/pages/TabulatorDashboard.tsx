import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompetitions, usePenaltyRules } from "@/hooks/useCompetitions";
import { useAllScoresForSubEvent, useCertification, useCertificationRealtime } from "@/hooks/useChiefJudge";
import { useJudgeScoresRealtime } from "@/hooks/useJudgeScores";
import { useTabulatorCertification, useUpsertTabulatorCert, useCertifyTabulator, useTabulatorCertificationRealtime } from "@/hooks/useTabulator";
import { useWitnessCertification, useUpsertWitnessCert, useCertifyWitness, useWitnessCertificationRealtime } from "@/hooks/useWitness";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { ScoreSummaryTable } from "@/components/tabulator/ScoreSummaryTable";
import { SideBySideScores } from "@/components/tabulator/SideBySideScores";
import { VoteAudit } from "@/components/tabulator/VoteAudit";
import { JudgeActivityIndicator } from "@/components/chief-judge/JudgeActivityIndicator";
import { ScoringProgressBar } from "@/components/shared/ScoringProgressBar";
import { PerformanceTimer } from "@/components/scoring/PerformanceTimer";
import { SignaturePad } from "@/components/registration/SignaturePad";
import { EventChat } from "@/components/chat/EventChat";
import { useChatUnreadCount } from "@/hooks/useEventChat";
import { CardGridSkeleton } from "@/components/shared/PageSkeletons";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

import {
  Calculator, Lock, CheckCircle, AlertTriangle, MessageSquare,
  Timer, Search, Trophy, ChevronRight, ChevronDown, ClipboardList, Zap, Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { JudgeScore } from "@/hooks/useJudgeScores";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

/* ─── Overview hook (from JudgingHub pattern) ─── */
function useJudgingOverview(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["judging_overview", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const { data: levels, error: le } = await supabase
        .from("competition_levels").select("*").eq("competition_id", competitionId!).order("sort_order");
      if (le) throw le;
      const levelIds = (levels || []).map((l) => l.id);
      if (!levelIds.length) return { levels: [], subEvents: [], assignments: [], profiles: [], registrations: [], scores: [] as JudgeScore[], rubric: [] };

      const { data: subEvents, error: se } = await supabase
        .from("sub_events").select("*").in("level_id", levelIds).order("event_date");
      if (se) throw se;
      const subEventIds = (subEvents || []).map((s) => s.id);

      const { data: assignments, error: ae } = subEventIds.length
        ? await supabase.from("sub_event_assignments").select("*").in("sub_event_id", subEventIds).eq("role", "judge" as any)
        : { data: [] as any[], error: null };
      if (ae) throw ae;

      const { data: registrations, error: re } = subEventIds.length
        ? await supabase.from("contestant_registrations")
            .select("id, full_name, sub_event_id, status, competition_id, user_id")
            .eq("competition_id", competitionId!).neq("status", "rejected")
        : { data: [] as any[], error: null };
      if (re) throw re;

      const userIds = [...new Set((assignments || []).map((a: any) => a.user_id))];
      const { data: profiles, error: pe } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds)
        : { data: [] as any[], error: null };
      if (pe) throw pe;

      const { data: scores, error: sce } = subEventIds.length
        ? await supabase.from("judge_scores").select("*").in("sub_event_id", subEventIds)
        : { data: [] as any[], error: null };
      if (sce) throw sce;

      const { data: rubric, error: rce } = await supabase
        .from("rubric_criteria").select("*").eq("competition_id", competitionId!).order("sort_order");
      if (rce) throw rce;

      return {
        levels: levels || [], subEvents: subEvents || [], assignments: assignments || [],
        profiles: profiles || [], registrations: registrations || [],
        scores: (scores || []) as JudgeScore[], rubric: rubric || [],
      };
    },
  });
}

/* ─── Sub-event Workspace ─── */
function SubEventWorkspace({
  subEventId, competitionId, registrations, rubricNames,
}: {
  subEventId: string; competitionId: string;
  registrations: any[]; rubricNames: string[];
}) {
  const { user } = useAuth();
  const { data: penalties } = usePenaltyRules(competitionId);
  const unreadCount = useChatUnreadCount(competitionId);

  const [performanceDuration, setPerformanceDuration] = useState(0);
  const [showCertifyDialog, setShowCertifyDialog] = useState(false);
  const [certifyMode, setCertifyMode] = useState<"tabulator" | "witness">("tabulator");
  const [signature, setSignature] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [physicalMatch, setPhysicalMatch] = useState(false);
  const [discrepancyNotes, setDiscrepancyNotes] = useState("");
  const [observations, setObservations] = useState("");

  const { data: allScores } = useAllScoresForSubEvent(subEventId);
  const { data: chiefCert } = useCertification(subEventId);
  const { data: tabCert } = useTabulatorCertification(subEventId);
  const { data: witnessCert } = useWitnessCertification(subEventId);
  useJudgeScoresRealtime(subEventId);
  useCertificationRealtime(subEventId);
  useTabulatorCertificationRealtime(subEventId);
  useWitnessCertificationRealtime(subEventId);

  const upsertTab = useUpsertTabulatorCert();
  const certifyTab = useCertifyTabulator();
  const upsertWitness = useUpsertWitnessCert();
  const certifyWitness = useCertifyWitness();

  const chiefCertified = chiefCert?.is_certified ?? false;
  const tabCertified = tabCert?.is_certified ?? false;
  const witnessCertified = witnessCert?.is_certified ?? false;

  const scoresByContestant = useMemo(() => {
    if (!allScores) return {};
    const map: Record<string, typeof allScores> = {};
    for (const s of allScores) {
      if (!map[s.contestant_registration_id]) map[s.contestant_registration_id] = [];
      map[s.contestant_registration_id].push(s);
    }
    return map;
  }, [allScores]);

  const contestantName = (regId: string) =>
    registrations.find((r: any) => r.id === regId)?.full_name ?? "Unknown";
  const contestantUserId = (regId: string) =>
    registrations.find((r: any) => r.id === regId)?.user_id;

  /* ── Tabulator certification ── */
  const handleInitTabCertify = async () => {
    if (!user || !subEventId) return;
    const payload: any = {
      sub_event_id: subEventId, tabulator_id: user.id,
      digital_vs_physical_match: physicalMatch, discrepancy_notes: discrepancyNotes || null,
    };
    if (tabCert) payload.id = tabCert.id;
    await upsertTab.mutateAsync(payload);
    setCertifyMode("tabulator");
    setConsentChecked(false);
    setSignature("");
    setShowCertifyDialog(true);
  };

  const handleTabCertify = async () => {
    if (!tabCert?.id || !signature) return;
    await certifyTab.mutateAsync({ id: tabCert.id, tabulator_signature: signature, sub_event_id: subEventId });
    setShowCertifyDialog(false);
  };

  /* ── Witness certification ── */
  const handleInitWitnessCertify = async () => {
    if (!user || !subEventId) return;
    const payload: any = { sub_event_id: subEventId, witness_id: user.id, observations: observations || null };
    if (witnessCert) payload.id = witnessCert.id;
    await upsertWitness.mutateAsync(payload);
    setCertifyMode("witness");
    setConsentChecked(false);
    setSignature("");
    setShowCertifyDialog(true);
  };

  const handleWitnessCertify = async () => {
    if (!witnessCert?.id || !signature) return;
    await certifyWitness.mutateAsync({ id: witnessCert.id, witness_signature: signature, sub_event_id: subEventId });
    setShowCertifyDialog(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Certification chain */}
      <div className="flex flex-wrap gap-2">
        <Badge variant={chiefCertified ? "secondary" : "outline"} className="gap-1">
          {chiefCertified ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          Chief Judge {chiefCertified ? "Certified" : "Pending"}
        </Badge>
        <Badge variant={tabCertified ? "secondary" : "outline"} className="gap-1">
          {tabCertified ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          Tabulator {tabCertified ? "Certified" : "Pending"}
        </Badge>
        <Badge variant={witnessCertified ? "secondary" : "outline"} className="gap-1">
          {witnessCertified ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          Witness {witnessCertified ? "Certified" : "Pending"}
        </Badge>
      </div>

      {/* Performance Timer */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Performance Timer</span>
            <span className="text-[10px] text-muted-foreground ml-auto font-mono">Space to start/stop</span>
          </div>
          <PerformanceTimer
            timeLimitSeconds={penalties?.[0]?.time_limit_seconds ?? 300}
            gracePeriodSeconds={penalties?.[0]?.grace_period_seconds ?? 30}
            onDurationChange={setPerformanceDuration}
          />
        </CardContent>
      </Card>

      {/* Scoring Progress + Judge Activity */}
      <div className="space-y-3">
        <ScoringProgressBar allScores={allScores} />
        <JudgeActivityIndicator
          subEventId={subEventId}
          allScores={allScores}
          contestantCount={Object.keys(scoresByContestant).length}
        />
      </div>

      {/* Score tools tabs */}
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
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detail">
          <div className="space-y-4">
            {Object.entries(scoresByContestant).map(([regId, scores]) => (
              <Card key={regId} className="border-border/50 bg-card/80">
                <CardContent className="pt-4">
                  <SideBySideScores
                    scores={scores}
                    rubricNames={rubricNames}
                    contestantName={contestantName(regId)}
                    contestantUserId={contestantUserId(regId)}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="votes">
          <VoteAudit subEventId={subEventId} />
        </TabsContent>
      </Tabs>

      {/* Tabulator certification controls */}
      {!tabCertified && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" /> Tabulator Certification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox id="physical-match" checked={physicalMatch} onCheckedChange={(c) => setPhysicalMatch(!!c)} />
              <label htmlFor="physical-match" className="text-sm text-foreground leading-snug">
                I confirm that digital scores match the physical scorecards
              </label>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Discrepancy Notes (optional)</label>
              <Textarea value={discrepancyNotes} onChange={(e) => setDiscrepancyNotes(e.target.value)}
                placeholder="Note any discrepancies between digital and physical records…" rows={2} />
            </div>
            <Button onClick={handleInitTabCertify} disabled={!physicalMatch || !chiefCertified || upsertTab.isPending} className="w-full">
              <Lock className="h-4 w-4 mr-1" /> Certify as Tabulator
            </Button>
            {!chiefCertified && (
              <p className="text-xs text-muted-foreground text-center">
                Waiting for Chief Judge certification before tabulator can sign off.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Witness certification controls */}
      {tabCertified && !witnessCertified && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> Witness Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Observations (optional)</label>
              <Textarea value={observations} onChange={(e) => setObservations(e.target.value)}
                placeholder="Record any observations about the scoring process…" rows={3} />
            </div>
            <Button onClick={handleInitWitnessCertify} disabled={upsertWitness.isPending} className="w-full">
              <Lock className="h-4 w-4 mr-1" /> Certify as Witness
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Production Chat */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full gap-2 text-xs relative">
            <MessageSquare className="h-4 w-4" /> Production Chat
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <EventChat competitionId={competitionId} />
        </CollapsibleContent>
      </Collapsible>

      {/* Certify Dialog (shared for tabulator & witness) */}
      <Dialog open={showCertifyDialog} onOpenChange={setShowCertifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{certifyMode === "tabulator" ? "Tabulator Certification" : "Witness Certification"}</DialogTitle>
            <DialogDescription>
              {certifyMode === "tabulator"
                ? "Sign to certify that digital records match physical scorecards."
                : "Sign to witness and counter-sign the certified results."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-md bg-primary/10 border border-primary/20">
              <AlertTriangle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-foreground">
                {certifyMode === "tabulator"
                  ? "By signing, you certify that all digital scores have been cross-verified against physical scorecards and the totals are accurate."
                  : "By signing, you attest that the scoring process was conducted fairly and the results are accurate as presented."}
              </p>
            </div>

            {certifyMode === "tabulator" && (
              <div className="text-sm space-y-1 text-muted-foreground">
                <div className="flex justify-between"><span>Contestants</span><span className="font-mono">{Object.keys(scoresByContestant).length}</span></div>
                <div className="flex justify-between"><span>Total scorecards</span><span className="font-mono">{allScores?.length ?? 0}</span></div>
                <div className="flex justify-between"><span>Physical match</span><span className="font-mono">{physicalMatch ? "Yes" : "No"}</span></div>
              </div>
            )}

            <SignaturePad
              label={certifyMode === "tabulator" ? "Tabulator Signature" : "Witness Signature"}
              onSignature={setSignature}
              signerRole={certifyMode === "tabulator" ? "Tabulator" : "Witness"}
            />

            <div className="flex items-start gap-2">
              <Checkbox id="certify-consent" checked={consentChecked} onCheckedChange={(v) => setConsentChecked(v === true)} />
              <Label htmlFor="certify-consent" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                {certifyMode === "tabulator"
                  ? "I confirm that all digital scores have been cross-verified against physical scorecards, the totals are accurate, and I consent to certify and permanently lock these results."
                  : "I attest that the scoring process was conducted fairly, the results are accurate as presented, and I consent to certify these results."}
              </Label>
            </div>

            <Button
              onClick={certifyMode === "tabulator" ? handleTabCertify : handleWitnessCertify}
              disabled={!signature || !consentChecked || (certifyMode === "tabulator" ? certifyTab.isPending : certifyWitness.isPending)}
              className="w-full"
            >
              <Lock className="h-4 w-4 mr-1" />
              {certifyMode === "tabulator"
                ? (certifyTab.isPending ? "Certifying…" : "Certify Records")
                : (certifyWitness.isPending ? "Certifying…" : "Witness & Certify")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

/* ─── Main Unified Dashboard ─── */
export default function TabulatorDashboard() {
  const { id: routeCompId } = useParams<{ id: string }>();
  const { data: competitions, isLoading: compsLoading } = useCompetitions();

  const activeComps = useMemo(
    () => (competitions || []).filter((c) => c.status === "active" || c.status === "completed"),
    [competitions]
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompId, setSelectedCompId] = useState(routeCompId || "");
  const [activeSubEventId, setActiveSubEventId] = useState("");
  const [expandedContestant, setExpandedContestant] = useState<string | null>(null);

  const { data: overview, isLoading: overviewLoading } = useJudgingOverview(selectedCompId || undefined);

  const filteredComps = useMemo(() => {
    if (!searchQuery.trim()) return activeComps;
    const q = searchQuery.toLowerCase();
    return activeComps.filter((c) => c.name.toLowerCase().includes(q));
  }, [activeComps, searchQuery]);

  const profileMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of overview?.profiles || []) m.set(p.user_id, p.full_name || p.email || "Unknown");
    return m;
  }, [overview?.profiles]);

  const rubricNames = useMemo(
    () => (overview?.rubric || []).map((r: any) => r.name), [overview?.rubric]
  );

  const activeSubEvent = overview?.subEvents.find((se) => se.id === activeSubEventId);

  if (compsLoading) return <CardGridSkeleton cards={3} />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" /> Tabulator Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Select a competition, then choose a sub-event to open the workspace.
        </p>
      </div>

      {/* Competition selector */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="pt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search competitions…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          {filteredComps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No competitions found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competition</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Start</TableHead>
                    <TableHead className="text-center">End</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComps.map((c) => (
                    <TableRow key={c.id}
                      className={`cursor-pointer transition-colors ${selectedCompId === c.id ? "bg-primary/10" : ""}`}
                      onClick={() => { setSelectedCompId(c.id); setActiveSubEventId(""); }}
                    >
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">{c.start_date || "—"}</TableCell>
                      <TableCell className="text-center font-mono text-xs">{c.end_date || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading */}
      {selectedCompId && overviewLoading && (
        <div className="text-muted-foreground font-mono text-sm animate-pulse">Loading levels…</div>
      )}

      {/* Level tabs + sub-event cards */}
      {selectedCompId && overview && (
        <>
          {overview.levels.length === 0 ? (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No levels configured for this competition yet.
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue={overview.levels[0]?.id} className="w-full">
              <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                {overview.levels.map((level) => (
                  <TabsTrigger key={level.id} value={level.id} className="text-xs sm:text-sm flex-1 min-w-[80px]">
                    {level.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {overview.levels.map((level) => {
                const levelSubEvents = overview.subEvents.filter((se) => se.level_id === level.id);
                return (
                  <TabsContent key={level.id} value={level.id}>
                    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 mt-4">
                      <div className="flex justify-end">
                        <Button asChild variant="default" size="sm">
                          <Link to={`/competitions/${selectedCompId}/level-sheet?level=${level.id}`}>
                            <Trophy className="h-3.5 w-3.5 mr-1.5" />
                            Level Master Sheet
                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Link>
                        </Button>
                      </div>

                      {levelSubEvents.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No sub-events yet.</p>
                      ) : (
                        (activeSubEventId ? levelSubEvents.filter((se) => se.id === activeSubEventId) : levelSubEvents).map((se) => {
                          const judges = overview.assignments.filter((a: any) => a.sub_event_id === se.id);
                          const contestants = overview.registrations.filter((r: any) => r.sub_event_id === se.id);
                          const seScores = (overview.scores || []).filter((s) => s.sub_event_id === se.id);
                          const isActive = activeSubEventId === se.id;

                          return (
                            <motion.div key={se.id} variants={item}>
                              <Card className={`border-border/40 bg-card/80 ${isActive ? "ring-2 ring-primary/40" : ""}`}>
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <CardTitle className="text-sm">{se.name}</CardTitle>
                                      <CardDescription className="font-mono text-xs">
                                        {se.event_date || "No date"} {se.start_time ? `• ${se.start_time}` : ""}
                                      </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className={
                                        se.status === "in_progress" ? "bg-primary/20 text-primary"
                                          : se.status === "completed" ? "bg-secondary/20 text-secondary"
                                          : "bg-muted text-muted-foreground"
                                      }>
                                        {se.status}
                                      </Badge>
                                      <Button
                                        size="sm"
                                        variant={isActive ? "secondary" : "default"}
                                        onClick={() => setActiveSubEventId(isActive ? "" : se.id)}
                                      >
                                        <Zap className="h-3.5 w-3.5 mr-1" />
                                        {isActive ? "Close" : "Select"}
                                      </Button>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  {/* Judges */}
                                  <div>
                                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Judges ({judges.length})</p>
                                    {judges.length === 0 ? (
                                      <p className="text-xs text-muted-foreground italic">No judges assigned</p>
                                    ) : (
                                      <div className="flex flex-wrap gap-1.5">
                                        {judges.map((j: any) => (
                                          <span key={j.id} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                            {profileMap.get(j.user_id) || "Unknown"}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Contestants */}
                                  <div>
                                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Contestants ({contestants.length})</p>
                                    {contestants.length === 0 ? (
                                      <p className="text-xs text-muted-foreground italic">No contestants registered</p>
                                    ) : (
                                      <div className="border border-border/40 rounded-md overflow-hidden">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="w-8">#</TableHead>
                                              <TableHead>Name</TableHead>
                                              <TableHead className="text-center">Scores</TableHead>
                                              <TableHead className="w-8"></TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {contestants.map((c: any, idx: number) => {
                                              const cScores = seScores.filter((s) => s.contestant_registration_id === c.id);
                                              const toggleKey = `${se.id}-${c.id}`;
                                              const isExpanded = expandedContestant === toggleKey;
                                              return (
                                                <>
                                                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50"
                                                    onClick={() => setExpandedContestant(isExpanded ? null : toggleKey)}>
                                                    <TableCell className="font-mono text-muted-foreground text-xs">{idx + 1}</TableCell>
                                                    <TableCell className="font-medium text-sm">{c.full_name}</TableCell>
                                                    <TableCell className="text-center">
                                                      <Badge variant="outline" className="text-xs">{cScores.length} judge{cScores.length !== 1 ? "s" : ""}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                                    </TableCell>
                                                  </TableRow>
                                                  {isExpanded && cScores.length > 0 && rubricNames.length > 0 && (
                                                    <TableRow key={`${c.id}-scores`}>
                                                      <TableCell colSpan={4} className="p-0 border-0">
                                                        <AnimatePresence>
                                                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden bg-muted/20 p-3">
                                                            <SideBySideScores
                                                              scores={cScores.map((s) => ({ ...s, judge_id: profileMap.get(s.judge_id) || s.judge_id.slice(0, 8) + "…" })) as any}
                                                              rubricNames={rubricNames}
                                                              contestantName={c.full_name}
                                                              contestantUserId={c.user_id}
                                                            />
                                                          </motion.div>
                                                        </AnimatePresence>
                                                      </TableCell>
                                                    </TableRow>
                                                  )}
                                                </>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    )}
                                  </div>

                                  {/* Score sheet link */}
                                  <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                                    <Link to={`/competitions/${selectedCompId}/master-sheet?sub_event=${se.id}`}>
                                      <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Master Score Sheet
                                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                    </Link>
                                  </Button>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })
                      )}
                    </motion.div>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </>
      )}

      {/* Active sub-event workspace */}
      {activeSubEventId && selectedCompId && overview && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">
              Workspace: {activeSubEvent?.name ?? "Sub-Event"}
            </h2>
          </div>
          <SubEventWorkspace
            subEventId={activeSubEventId}
            competitionId={selectedCompId}
            registrations={overview.registrations}
            rubricNames={rubricNames}
          />
        </div>
      )}
    </div>
  );
}
