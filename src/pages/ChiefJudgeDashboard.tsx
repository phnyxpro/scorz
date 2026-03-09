import { useState, useMemo, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompetition, useLevels, useSubEvents, useRubricCriteria, usePenaltyRules, useInfractions } from "@/hooks/useCompetitions";
import { useMyAssignedSubEvents } from "@/hooks/useSubEventAssignments";
import { useRegistrations } from "@/hooks/useRegistrations";
import {
  useAllScoresForSubEvent,
  useCertification,
  useUpsertCertification,
  useCertifySubEvent,
  useAdjustPenalty,
  useCertificationRealtime,
} from "@/hooks/useChiefJudge";
import { useJudgeScoresRealtime } from "@/hooks/useJudgeScores";
import { SignaturePad } from "@/components/registration/SignaturePad";
import { ActiveScoringManager } from "@/components/competition/ActiveScoringManager";
import { calculateMethodScore } from "@/lib/scoring-methods";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PanelMonitor } from "@/components/chief-judge/PanelMonitor";
import { TieBreaker } from "@/components/chief-judge/TieBreaker";
import { PenaltyReview } from "@/components/chief-judge/PenaltyReview";
import { InfractionApplicator } from "@/components/chief-judge/InfractionApplicator";
import { ContestantScoresTab } from "@/components/chief-judge/ContestantScoresTab";
import { JudgeActivityIndicator } from "@/components/chief-judge/JudgeActivityIndicator";
import { ScoringProgressBar } from "@/components/shared/ScoringProgressBar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Shield, Lock, CheckCircle, AlertTriangle, ClipboardList, ChevronRight, FileText, MessageSquare, Zap, Gavel } from "lucide-react";
import { EventChat } from "@/components/chat/EventChat";
import { useChatUnreadCount } from "@/hooks/useEventChat";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { motion } from "framer-motion";
import { ConnectionIndicator } from "@/components/shared/ConnectionIndicator";

export default function ChiefJudgeDashboard() {
  const { id: competitionId } = useParams<{ id: string }>();
  const unreadCount = useChatUnreadCount(competitionId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [cjTab, setCjTab] = useState("panel");
  const { data: comp } = useCompetition(competitionId);
  const { data: levels } = useLevels(competitionId);
  const { data: rubric } = useRubricCriteria(competitionId);
  const { data: penalties } = usePenaltyRules(competitionId);
  const { data: registrations } = useRegistrations(competitionId);

  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [selectedSubEventId, setSelectedSubEventId] = useState("");
  const [showCertifyDialog, setShowCertifyDialog] = useState(false);
  const [signature, setSignature] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);

  // Auto-select first level
  if (levels?.length && !selectedLevelId) {
    setSelectedLevelId(levels[0].id);
  }

  const { data: allSubEvents } = useSubEvents(selectedLevelId || undefined);
  const { data: myAssignments } = useMyAssignedSubEvents("judge", { isChief: true });

  // Filter sub-events to assigned ones
  const subEvents = useMemo(() => {
    if (!allSubEvents || !myAssignments) return [];
    const assignedIds = new Set(myAssignments.map((a) => a.sub_event_id));
    return allSubEvents.filter((se) => assignedIds.has(se.id));
  }, [allSubEvents, myAssignments]);

  const { data: allScores, isLoading: scoresLoading } = useAllScoresForSubEvent(selectedSubEventId || undefined);
  const { data: certification } = useCertification(selectedSubEventId || undefined);
  useJudgeScoresRealtime(selectedSubEventId || undefined);
  useCertificationRealtime(selectedSubEventId || undefined);

  const upsertCert = useUpsertCertification();
  const certifySubEvent = useCertifySubEvent();
  const adjustPenalty = useAdjustPenalty();

  const isCertified = certification?.is_certified ?? false;

  // Group scores by contestant
  const scoresByContestant = useMemo(() => {
    if (!allScores) return {};
    const map: Record<string, typeof allScores> = {};
    for (const s of allScores) {
      if (!map[s.contestant_registration_id]) map[s.contestant_registration_id] = [];
      map[s.contestant_registration_id].push(s);
    }
    return map;
  }, [allScores]);

  // Get unique judge IDs
  const judgeIds = useMemo(() => {
    if (!allScores) return [];
    return [...new Set(allScores.map(s => s.judge_id))];
  }, [allScores]);

  // Contestant name lookup
  const contestantName = (regId: string) =>
    registrations?.find(r => r.id === regId)?.full_name ?? "Unknown";

  const contestantUserId = (regId: string) =>
    registrations?.find(r => r.id === regId)?.user_id;

  // Calculate averages for tie detection using the competition's scoring method
  const scoringMethod = comp?.scoring_method ?? "olympic";
  const contestantAverages = useMemo(() => {
    const avgs: { regId: string; avg: number; scores: typeof allScores }[] = [];
    for (const [regId, scores] of Object.entries(scoresByContestant)) {
      const certified = scores!.filter(s => s.is_certified);
      if (certified.length === 0) continue;
      const rawTotals = certified.map(s => Number(s.raw_total));
      const maxPenalty = Math.max(...certified.map(s => Number(s.time_penalty)), 0);
      const avgFinal = calculateMethodScore(scoringMethod, rawTotals, maxPenalty);
      avgs.push({ regId, avg: avgFinal, scores: scores! });
    }
    return avgs.sort((a, b) => b.avg - a.avg);
  }, [scoresByContestant, scoringMethod]);

  // Detect ties
  const ties = useMemo(() => {
    const tieGroups: typeof contestantAverages[] = [];
    let i = 0;
    while (i < contestantAverages.length) {
      let j = i + 1;
      while (j < contestantAverages.length && Math.abs(contestantAverages[j].avg - contestantAverages[i].avg) < 0.001) {
        j++;
      }
      if (j - i > 1) {
        tieGroups.push(contestantAverages.slice(i, j));
      }
      i = j;
    }
    return tieGroups;
  }, [contestantAverages]);

  // All judges certified for all contestants?
  const allJudgesCertified = allScores?.length
    ? allScores.every(s => s.is_certified)
    : false;

  const handleInitCertification = async () => {
    if (!user || !selectedSubEventId) return;
    if (!certification) {
      await upsertCert.mutateAsync({
        sub_event_id: selectedSubEventId,
        chief_judge_id: user.id,
      } as any);
    }
    setConsentChecked(false);
    setSignature("");
    setShowCertifyDialog(true);
  };

  const handleCertify = async () => {
    if (!certification?.id || !signature) return;
    try {
      await certifySubEvent.mutateAsync({
        id: certification.id,
        chief_judge_signature: signature,
        sub_event_id: selectedSubEventId,
      });
      setShowCertifyDialog(false);
    } catch (error) {
      console.error("Certification error:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/competitions/${competitionId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">Chief Judge Dashboard <ConnectionIndicator /></h1>
          </div>
          <p className="text-muted-foreground text-xs">{comp?.name}</p>
        </div>
        {isCertified && (
          <Badge className="bg-secondary/20 text-secondary">
            <CheckCircle className="h-3 w-3 mr-1" /> Certified
          </Badge>
        )}
      </div>

      {/* Action Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* Active Scoring Card */}
        <Collapsible>
          <Card className="border-border/50 bg-card/80">
            <CollapsibleTrigger asChild>
              <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-medium">Active Scoring Control</CardTitle>
                  </div>
                  {comp?.active_scoring_sub_event_id && (
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">LIVE</Badge>
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-3">
                {comp && (
                  <ActiveScoringManager
                    competitionId={competitionId}
                    activeLevelId={comp.active_scoring_level_id}
                    activeSubEventId={comp.active_scoring_sub_event_id}
                  />
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Production Chat Card */}
        <Collapsible>
          <Card className="border-border/50 bg-card/80">
            <CollapsibleTrigger asChild>
              <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-medium">Production Chat</CardTitle>
                  </div>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="text-[10px] h-5 min-w-5 px-1.5">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-3">
                <EventChat competitionId={competitionId!} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Level Master Sheet link */}
      {selectedLevelId && (
        <Button asChild variant="outline" size="sm" className="mb-3 gap-2 text-xs w-full">
          <Link to={`/competitions/${competitionId}/level-sheet?level=${selectedLevelId}`}>
            <ClipboardList className="h-3.5 w-3.5" /> View Level Master Sheet
          </Link>
        </Button>
      )}

      {/* Sub-event selector */}
      <Card className="border-border/50 bg-card/80 mb-4">
        <CardContent className="pt-4 space-y-3">
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
              <label className="text-xs text-muted-foreground">Sub-Event</label>
              <Select value={selectedSubEventId} onValueChange={setSelectedSubEventId}>
                <SelectTrigger><SelectValue placeholder="Select sub-event" /></SelectTrigger>
                <SelectContent>
                  {subEvents.map(se => <SelectItem key={se.id} value={se.id}>{se.name}</SelectItem>)}
                  {subEvents.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No assigned sub-events</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedSubEventId && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Summary card */}
          <Card className="border-border/50 bg-card/80 mb-4">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Contestants</p>
                  <p className="text-xl font-bold text-foreground">{Object.keys(scoresByContestant).length}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Scorecards</p>
                  <p className="text-xl font-bold text-foreground">{allScores?.length ?? 0}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Certified</p>
                  <p className="text-xl font-bold text-foreground">{allScores?.filter(s => s.is_certified).length ?? 0}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Ties</p>
                  <p className="text-xl font-bold text-foreground">{ties.length}</p>
                </div>
              </div>
              <div className="flex justify-end mt-3 gap-2 flex-wrap">
                <Button asChild variant="outline" size="sm" className="text-xs">
                  <Link to={`/competitions/${competitionId}/rules`}>
                    <FileText className="h-3.5 w-3.5 mr-1.5" /> Rules
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="text-xs">
                  <Link to={`/competitions/${competitionId}/penalties`}>
                    <Gavel className="h-3.5 w-3.5 mr-1.5" /> Penalties
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="text-xs">
                  <Link to={`/competitions/${competitionId}/rubric`}>
                    <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Rubric
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="text-xs">
                  <Link to={`/competitions/${competitionId}/master-sheet?sub_event=${selectedSubEventId}`}>
                    <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                    Master Score Sheet
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Scoring Progress */}
          <div className="mb-4">
            <ScoringProgressBar allScores={allScores} />
          </div>

          {/* Judge Activity Indicator */}
          <JudgeActivityIndicator
            subEventId={selectedSubEventId}
            allScores={allScores}
            contestantCount={Object.keys(scoresByContestant).length}
          />

          <Tabs value={cjTab} onValueChange={setCjTab} className="space-y-4 mt-4">
            {isMobile ? (
              <Select value={cjTab} onValueChange={setCjTab}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="panel">Panel Monitor</SelectItem>
                  <SelectItem value="scores">Scores</SelectItem>
                  <SelectItem value="penalties">Penalty Review</SelectItem>
                  <SelectItem value="infractions">Infractions</SelectItem>
                  <SelectItem value="ties">Tie Breaking</SelectItem>
                </SelectContent>
              </Select>
            ) : (
            <TabsList>
              <TabsTrigger value="panel">Panel Monitor</TabsTrigger>
              <TabsTrigger value="scores">Scores</TabsTrigger>
              <TabsTrigger value="penalties">Penalty Review</TabsTrigger>
              <TabsTrigger value="infractions">Infractions</TabsTrigger>
              <TabsTrigger value="ties">Tie Breaking</TabsTrigger>
            </TabsList>
            )}

            <TabsContent value="panel">
              <PanelMonitor
                scoresByContestant={scoresByContestant}
                judgeIds={judgeIds}
                contestantName={contestantName}
                contestantUserId={contestantUserId}
                isCertified={isCertified}
                contestantAverages={contestantAverages}
              />
            </TabsContent>

            <TabsContent value="scores">
              <ContestantScoresTab
                competitionId={competitionId!}
                subEventId={selectedSubEventId}
                allScores={allScores}
              />
            </TabsContent>

            <TabsContent value="penalties">
              <PenaltyReview
                allScores={allScores || []}
                contestantName={contestantName}
                contestantUserId={contestantUserId}
                isCertified={isCertified}
                onAdjust={(scoreId, newPenalty) =>
                  adjustPenalty.mutate({ scoreId, newPenalty, subEventId: selectedSubEventId })
                }
                isAdjusting={adjustPenalty.isPending}
              />
            </TabsContent>

            <TabsContent value="infractions">
              <InfractionApplicator
                competitionId={competitionId!}
                subEventId={selectedSubEventId}
                contestantIds={Object.keys(scoresByContestant)}
                contestantName={contestantName}
                isCertified={isCertified}
              />
            </TabsContent>

            <TabsContent value="ties">
              <TieBreaker
                ties={ties}
                contestantName={contestantName}
                isCertified={isCertified}
                certification={certification}
                onSaveTieBreakOrder={async (tieBreakOrder, tieNotes) => {
                  if (!user || !selectedSubEventId) return;
                  await upsertCert.mutateAsync({
                    id: certification?.id,
                    sub_event_id: selectedSubEventId,
                    chief_judge_id: user.id,
                    tie_break_order: tieBreakOrder,
                    tie_break_notes: tieNotes,
                  } as any);
                }}
              />
            </TabsContent>
          </Tabs>

          {/* Final certification */}
          {!isCertified && (
            <Card className="border-border/50 bg-card/80 mt-4">
              <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Final Certification</p>
                  <p className="text-xs text-muted-foreground">
                    {allJudgesCertified
                      ? "All judge scorecards are certified. You may certify this sub-event."
                      : "Waiting for all judges to certify their scorecards."}
                  </p>
                </div>
                <Button
                  onClick={handleInitCertification}
                  disabled={!allJudgesCertified || upsertCert.isPending}
                  className="w-full sm:w-auto"
                >
                  <Lock className="h-4 w-4 mr-1" /> Certify Sub-Event
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}


      {/* Certify Dialog */}
      <Dialog open={showCertifyDialog} onOpenChange={setShowCertifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Certify Sub-Event Results</DialogTitle>
            <DialogDescription>
              Sign below to certify all results for this sub-event. This action is final.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-md bg-primary/10 border border-primary/20">
              <AlertTriangle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-foreground">
                By signing, you certify that all scores have been reviewed, penalties are accurate,
                and any ties have been properly resolved. Results will be published.
              </p>
            </div>

            <div className="text-sm space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span>Contestants scored</span>
                <span className="font-mono">{Object.keys(scoresByContestant).length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total scorecards</span>
                <span className="font-mono">{allScores?.length ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Ties detected</span>
                <span className="font-mono">{ties.length}</span>
              </div>
            </div>

            <SignaturePad label="Chief Judge Signature" onSignature={setSignature} signerRole="Chief Judge" />

            <div className="flex items-start gap-2">
              <Checkbox
                id="certify-consent"
                checked={consentChecked}
                onCheckedChange={(v) => setConsentChecked(v === true)}
              />
              <Label htmlFor="certify-consent" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                I confirm that all scores have been reviewed, penalties are accurate, ties have been resolved, and I consent to certify and permanently lock these results.
              </Label>
            </div>

            <Button
              onClick={handleCertify}
              disabled={!signature || !consentChecked || certifySubEvent.isPending}
              className="w-full"
            >
              <Lock className="h-4 w-4 mr-1" />
              {certifySubEvent.isPending ? "Certifying…" : "Certify & Lock Results"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
