import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompetition, useLevels, useSubEvents, useRubricCriteria } from "@/hooks/useCompetitions";
import { useMyAssignedSubEvents } from "@/hooks/useSubEventAssignments";
import { useRegistrations } from "@/hooks/useRegistrations";
import { useAllScoresForSubEvent, useCertification, useCertificationRealtime } from "@/hooks/useChiefJudge";
import { useJudgeScoresRealtime } from "@/hooks/useJudgeScores";
import { useTabulatorCertification, useUpsertTabulatorCert, useCertifyTabulator } from "@/hooks/useTabulator";
import { ScoreSummaryTable } from "@/components/tabulator/ScoreSummaryTable";
import { SideBySideScores } from "@/components/tabulator/SideBySideScores";
import { VoteAudit } from "@/components/tabulator/VoteAudit";
import { ActiveScoringManager } from "@/components/competition/ActiveScoringManager";
import { SignaturePad } from "@/components/registration/SignaturePad";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Calculator, Lock, CheckCircle, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function TabulatorDashboard() {
  const { id: competitionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: comp } = useCompetition(competitionId);
  const { data: levels } = useLevels(competitionId);
  const { data: rubric } = useRubricCriteria(competitionId);
  const { data: registrations } = useRegistrations(competitionId);

  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [selectedSubEventId, setSelectedSubEventId] = useState("");
  const [showCertifyDialog, setShowCertifyDialog] = useState(false);
  const [signature, setSignature] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [physicalMatch, setPhysicalMatch] = useState(false);
  const [discrepancyNotes, setDiscrepancyNotes] = useState("");

  if (levels?.length && !selectedLevelId) setSelectedLevelId(levels[0].id);

  const { data: allSubEvents } = useSubEvents(selectedLevelId || undefined);
  const { data: myAssignments } = useMyAssignedSubEvents("tabulator");

  const subEvents = useMemo(() => {
    if (!allSubEvents || !myAssignments) return [];
    const assignedIds = new Set(myAssignments.map((a) => a.sub_event_id));
    return allSubEvents.filter((se) => assignedIds.has(se.id));
  }, [allSubEvents, myAssignments]);

  const { data: allScores } = useAllScoresForSubEvent(selectedSubEventId || undefined);
  const { data: chiefCert } = useCertification(selectedSubEventId || undefined);
  const { data: tabCert } = useTabulatorCertification(selectedSubEventId || undefined);
  useJudgeScoresRealtime(selectedSubEventId || undefined);
  useCertificationRealtime(selectedSubEventId || undefined);

  const upsertTab = useUpsertTabulatorCert();
  const certifyTab = useCertifyTabulator();

  const isCertified = tabCert?.is_certified ?? false;
  const chiefCertified = chiefCert?.is_certified ?? false;

  const rubricNames = useMemo(() => rubric?.map((r) => r.name) ?? [], [rubric]);

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
    registrations?.find((r) => r.id === regId)?.full_name ?? "Unknown";

  const contestantUserId = (regId: string) =>
    registrations?.find((r) => r.id === regId)?.user_id;

  const handleInitCertify = async () => {
    if (!user || !selectedSubEventId) return;
    if (!tabCert) {
      await upsertTab.mutateAsync({
        sub_event_id: selectedSubEventId,
        tabulator_id: user.id,
        digital_vs_physical_match: physicalMatch,
        discrepancy_notes: discrepancyNotes || null,
      } as any);
    } else {
      await upsertTab.mutateAsync({
        id: tabCert.id,
        sub_event_id: selectedSubEventId,
        tabulator_id: user.id,
        digital_vs_physical_match: physicalMatch,
        discrepancy_notes: discrepancyNotes || null,
      } as any);
    }
    setConsentChecked(false);
    setSignature("");
    setShowCertifyDialog(true);
  };

  const handleCertify = async () => {
    const cert = tabCert;
    if (!cert?.id || !signature) return;
    await certifyTab.mutateAsync({
      id: cert.id,
      tabulator_signature: signature,
      sub_event_id: selectedSubEventId,
    });
    setShowCertifyDialog(false);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/competitions/${competitionId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Tabulator Dashboard</h1>
          </div>
          <p className="text-muted-foreground text-xs">{comp?.name}</p>
        </div>
        {isCertified && (
          <Badge className="bg-secondary/20 text-secondary">
            <CheckCircle className="h-3 w-3 mr-1" /> Certified
          </Badge>
        )}
      </div>

      {/* Active scoring manager */}
      <div className="mb-6">
        <ActiveScoringManager
          competitionId={competitionId!}
          activeLevelId={comp?.active_scoring_level_id}
          activeSubEventId={comp?.active_scoring_sub_event_id}
        />
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
          <div className="flex gap-2 mb-4">
            <Badge variant={chiefCertified ? "secondary" : "outline"} className="gap-1">
              {chiefCertified ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              Chief Judge {chiefCertified ? "Certified" : "Pending"}
            </Badge>
            <Badge variant={isCertified ? "secondary" : "outline"} className="gap-1">
              {isCertified ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              Tabulator {isCertified ? "Certified" : "Pending"}
            </Badge>
          </div>

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
              <VoteAudit subEventId={selectedSubEventId} />
            </TabsContent>
          </Tabs>

          {/* Physical match & certification */}
          {!isCertified && (
            <Card className="border-border/50 bg-card/80 mt-4">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="physical-match"
                    checked={physicalMatch}
                    onCheckedChange={(c) => setPhysicalMatch(!!c)}
                  />
                  <label htmlFor="physical-match" className="text-sm text-foreground leading-snug">
                    I confirm that digital scores match the physical scorecards
                  </label>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Discrepancy Notes (optional)</label>
                  <Textarea
                    value={discrepancyNotes}
                    onChange={(e) => setDiscrepancyNotes(e.target.value)}
                    placeholder="Note any discrepancies between digital and physical records…"
                    rows={2}
                  />
                </div>
                <Button
                  onClick={handleInitCertify}
                  disabled={!physicalMatch || !chiefCertified || upsertTab.isPending}
                  className="w-full"
                >
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
        </motion.div>
      )}

      {/* Certify Dialog */}
      <Dialog open={showCertifyDialog} onOpenChange={setShowCertifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tabulator Certification</DialogTitle>
            <DialogDescription>
              Sign to certify that digital records match physical scorecards.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-md bg-primary/10 border border-primary/20">
              <AlertTriangle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-foreground">
                By signing, you certify that all digital scores have been cross-verified against
                physical scorecards and the totals are accurate.
              </p>
            </div>

            <div className="text-sm space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span>Contestants</span>
                <span className="font-mono">{Object.keys(scoresByContestant).length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total scorecards</span>
                <span className="font-mono">{allScores?.length ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Physical match</span>
                <span className="font-mono">{physicalMatch ? "Yes" : "No"}</span>
              </div>
            </div>

            <SignaturePad label="Tabulator Signature" onSignature={setSignature} />

            <div className="flex items-start gap-2">
              <Checkbox
                id="certify-consent"
                checked={consentChecked}
                onCheckedChange={(v) => setConsentChecked(v === true)}
              />
              <Label htmlFor="certify-consent" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                I confirm that all digital scores have been cross-verified against physical scorecards, the totals are accurate, and I consent to certify and permanently lock these results.
              </Label>
            </div>

            <Button
              onClick={handleCertify}
              disabled={!signature || !consentChecked || certifyTab.isPending}
              className="w-full"
            >
              <Lock className="h-4 w-4 mr-1" />
              {certifyTab.isPending ? "Certifying…" : "Certify Records"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
