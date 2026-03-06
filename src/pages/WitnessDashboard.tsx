import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompetition, useLevels, useSubEvents, useRubricCriteria } from "@/hooks/useCompetitions";
import { useMyAssignedSubEvents } from "@/hooks/useSubEventAssignments";
import { useRegistrations } from "@/hooks/useRegistrations";
import { useAllScoresForSubEvent, useCertification, useCertificationRealtime } from "@/hooks/useChiefJudge";
import { useJudgeScoresRealtime } from "@/hooks/useJudgeScores";
import { useTabulatorCertification, useTabulatorCertificationRealtime } from "@/hooks/useTabulator";
import { useWitnessCertification, useUpsertWitnessCert, useCertifyWitness, useWitnessCertificationRealtime } from "@/hooks/useWitness";
import { ScoreSummaryTable } from "@/components/tabulator/ScoreSummaryTable";
import { SignaturePad } from "@/components/registration/SignaturePad";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Eye, Lock, CheckCircle, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function WitnessDashboard() {
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
  const [observations, setObservations] = useState("");

  if (levels?.length && !selectedLevelId) setSelectedLevelId(levels[0].id);

  const { data: allSubEvents } = useSubEvents(selectedLevelId || undefined);
  const { data: myAssignments } = useMyAssignedSubEvents("witness");

  const subEvents = useMemo(() => {
    if (!allSubEvents || !myAssignments) return [];
    const assignedIds = new Set(myAssignments.map((a) => a.sub_event_id));
    return allSubEvents.filter((se) => assignedIds.has(se.id));
  }, [allSubEvents, myAssignments]);

  const { data: allScores } = useAllScoresForSubEvent(selectedSubEventId || undefined);
  const { data: chiefCert } = useCertification(selectedSubEventId || undefined);
  const { data: tabCert } = useTabulatorCertification(selectedSubEventId || undefined);
  const { data: witnessCert } = useWitnessCertification(selectedSubEventId || undefined);
  useJudgeScoresRealtime(selectedSubEventId || undefined);
  useCertificationRealtime(selectedSubEventId || undefined);
  useTabulatorCertificationRealtime(selectedSubEventId || undefined);
  useWitnessCertificationRealtime(selectedSubEventId || undefined);

  const upsertWitness = useUpsertWitnessCert();
  const certifyWitness = useCertifyWitness();

  const isCertified = witnessCert?.is_certified ?? false;
  const chiefCertified = chiefCert?.is_certified ?? false;
  const tabCertified = tabCert?.is_certified ?? false;

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

  const handleInitCertify = async () => {
    if (!user || !selectedSubEventId) return;
    if (!witnessCert) {
      await upsertWitness.mutateAsync({
        sub_event_id: selectedSubEventId,
        witness_id: user.id,
        observations: observations || null,
      } as any);
    } else {
      await upsertWitness.mutateAsync({
        id: witnessCert.id,
        sub_event_id: selectedSubEventId,
        witness_id: user.id,
        observations: observations || null,
      } as any);
    }
    setConsentChecked(false);
    setSignature("");
    setShowCertifyDialog(true);
  };

  const handleCertify = async () => {
    const cert = witnessCert;
    if (!cert?.id || !signature) return;
    try {
      await certifyWitness.mutateAsync({
        id: cert.id,
        witness_signature: signature,
        sub_event_id: selectedSubEventId,
      });
      setShowCertifyDialog(false);
    } catch (error) {
      console.error("Certification error:", error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/competitions/${competitionId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Witness Verification</h1>
          </div>
          <p className="text-muted-foreground text-xs">{comp?.name}</p>
        </div>
        {isCertified && (
          <Badge className="bg-secondary/20 text-secondary">
            <CheckCircle className="h-3 w-3 mr-1" /> Certified
          </Badge>
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Certification chain */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant={chiefCertified ? "secondary" : "outline"} className="gap-1">
              {chiefCertified ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              Chief Judge
            </Badge>
            <Badge variant={tabCertified ? "secondary" : "outline"} className="gap-1">
              {tabCertified ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              Tabulator
            </Badge>
            <Badge variant={isCertified ? "secondary" : "outline"} className="gap-1">
              {isCertified ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              Witness
            </Badge>
          </div>

          {/* Read-only score summary */}
          <Card className="border-border/50 bg-card/80">
            <CardContent className="pt-4">
              <ScoreSummaryTable
                scoresByContestant={scoresByContestant}
                contestantName={contestantName}
                rubricNames={rubricNames}
              />
            </CardContent>
          </Card>

          {/* Observations & certification */}
          {!isCertified && (
            <Card className="border-border/50 bg-card/80 mt-4">
              <CardContent className="pt-4 space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground">Observations (optional)</label>
                  <Textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Record any observations about the scoring process…"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleInitCertify}
                  disabled={!tabCertified || upsertWitness.isPending}
                  className="w-full"
                >
                  <Lock className="h-4 w-4 mr-1" /> Certify as Witness
                </Button>
                {!tabCertified && (
                  <p className="text-xs text-muted-foreground text-center">
                    Waiting for Tabulator certification before witness can sign off.
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
            <DialogTitle>Witness Certification</DialogTitle>
            <DialogDescription>
              Sign to witness and counter-sign the certified results.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-md bg-primary/10 border border-primary/20">
              <AlertTriangle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-foreground">
                By signing, you attest that the scoring process was conducted fairly
                and the results are accurate as presented.
              </p>
            </div>

            <SignaturePad label="Witness Signature" onSignature={setSignature} signerRole="Witness" />

            <div className="flex items-start gap-2">
              <Checkbox
                id="certify-consent"
                checked={consentChecked}
                onCheckedChange={(v) => setConsentChecked(v === true)}
              />
              <Label htmlFor="certify-consent" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                I attest that the scoring process was conducted fairly, the results are accurate as presented, and I consent to certify these results.
              </Label>
            </div>

            <Button
              onClick={handleCertify}
              disabled={!signature || !consentChecked || certifyWitness.isPending}
              className="w-full"
            >
              <Lock className="h-4 w-4 mr-1" />
              {certifyWitness.isPending ? "Certifying…" : "Witness & Certify"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
