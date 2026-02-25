import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompetition, useRubricCriteria, usePenaltyRules } from "@/hooks/useCompetitions";
import { useRegistrations } from "@/hooks/useRegistrations";
import { useMyScoreForContestant, useUpsertScore, useCertifyScore } from "@/hooks/useJudgeScores";
import { PerformanceTimer } from "@/components/scoring/PerformanceTimer";
import { CriterionSlider } from "@/components/scoring/CriterionSlider";
import { SpeechComments } from "@/components/scoring/SpeechComments";
import { SignaturePad } from "@/components/registration/SignaturePad";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Save, Lock, CheckCircle, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

export default function JudgeScoring() {
  const { id: competitionId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const subEventId = searchParams.get("sub_event") || "";
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: comp } = useCompetition(competitionId);
  const { data: rubric } = useRubricCriteria(competitionId);
  const { data: penalties } = usePenaltyRules(competitionId);
  const { data: registrations } = useRegistrations(competitionId);

  const [selectedContestant, setSelectedContestant] = useState("");
  const { data: existingScore, isLoading: scoreLoading } = useMyScoreForContestant(subEventId, selectedContestant || undefined);

  const upsert = useUpsertScore();
  const certify = useCertifyScore();

  // Scoring state
  const [scores, setScores] = useState<Record<string, number>>({});
  const [duration, setDuration] = useState(0);
  const [comments, setComments] = useState("");
  const [showCertifyDialog, setShowCertifyDialog] = useState(false);
  const [signature, setSignature] = useState("");

  const timeLimitSecs = penalties?.[0]?.time_limit_seconds ?? 240;
  const gracePeriodSecs = penalties?.[0]?.grace_period_seconds ?? 15;

  // Load existing score
  useEffect(() => {
    if (existingScore) {
      setScores(existingScore.criterion_scores || {});
      setDuration(existingScore.performance_duration_seconds || 0);
      setComments(existingScore.comments || "");
    } else {
      setScores({});
      setDuration(0);
      setComments("");
    }
  }, [existingScore]);

  // Calculate penalty
  const calculatePenalty = useCallback((durationSecs: number): number => {
    if (!penalties?.length) return 0;
    let totalPenalty = 0;
    const overTime = durationSecs - timeLimitSecs - gracePeriodSecs;
    if (overTime <= 0) return 0;
    for (const rule of penalties) {
      const fromOver = rule.from_seconds - timeLimitSecs - gracePeriodSecs;
      if (durationSecs >= rule.from_seconds) {
        if (!rule.to_seconds || durationSecs <= rule.to_seconds) {
          totalPenalty = Math.max(totalPenalty, rule.penalty_points);
        }
      }
    }
    return totalPenalty;
  }, [penalties, timeLimitSecs, gracePeriodSecs]);

  const rawTotal = Object.values(scores).reduce((a, b) => a + b, 0);
  const timePenalty = calculatePenalty(duration);
  const finalScore = Math.max(0, rawTotal - timePenalty);
  const isCertified = existingScore?.is_certified ?? false;

  const handleSave = async () => {
    if (!user || !subEventId || !selectedContestant) return;
    await upsert.mutateAsync({
      id: existingScore?.id,
      sub_event_id: subEventId,
      judge_id: user.id,
      contestant_registration_id: selectedContestant,
      criterion_scores: scores,
      raw_total: rawTotal,
      performance_duration_seconds: duration,
      time_penalty: timePenalty,
      final_score: finalScore,
      comments: comments || undefined,
    } as any);
    toast({ title: "Score saved" });
  };

  const handleCertify = async () => {
    if (!existingScore?.id || !signature) return;
    await certify.mutateAsync({
      id: existingScore.id,
      judge_signature: signature,
      sub_event_id: subEventId,
      contestant_registration_id: selectedContestant,
    });
    setShowCertifyDialog(false);
  };

  const allScored = rubric ? rubric.every(c => scores[c.id] > 0) : false;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/competitions/${competitionId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Judge Scoring</h1>
          <p className="text-muted-foreground text-xs">{comp?.name}</p>
        </div>
      </div>

      {/* Contestant selector */}
      <Card className="border-border/50 bg-card/80 mb-4">
        <CardContent className="pt-4">
          <label className="text-xs text-muted-foreground mb-1 block">Select Contestant</label>
          <Select value={selectedContestant} onValueChange={setSelectedContestant}>
            <SelectTrigger><SelectValue placeholder="Choose a contestant…" /></SelectTrigger>
            <SelectContent>
              {registrations?.filter(r => r.status !== "rejected" && (!subEventId || r.sub_event_id === subEventId || !r.sub_event_id)).map(r => (
                <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedContestant && !scoreLoading && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {isCertified && (
            <Card className="border-secondary/30 bg-secondary/10">
              <CardContent className="flex items-center gap-2 py-3">
                <CheckCircle className="h-4 w-4 text-secondary" />
                <span className="text-sm text-secondary font-medium">This scorecard is certified and locked</span>
              </CardContent>
            </Card>
          )}

          {/* Performance Timer */}
          <PerformanceTimer
            timeLimitSeconds={timeLimitSecs}
            gracePeriodSeconds={gracePeriodSecs}
            onDurationChange={setDuration}
            disabled={isCertified}
          />

          {/* Scoring Criteria */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Scoring Card</CardTitle>
              <CardDescription>Rate each criterion from 1 to 5</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {rubric?.map(criterion => (
                <CriterionSlider
                  key={criterion.id}
                  criterion={criterion}
                  value={scores[criterion.id] || 0}
                  onChange={v => setScores(prev => ({ ...prev, [criterion.id]: v }))}
                  disabled={isCertified}
                />
              ))}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card className="border-border/50 bg-card/80">
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Raw Total</p>
                  <p className="text-lg font-mono font-bold text-foreground">{rawTotal}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time Penalty</p>
                  <p className={`text-lg font-mono font-bold ${timePenalty > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {timePenalty > 0 ? `-${timePenalty}` : "0"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Final Score</p>
                  <p className="text-lg font-mono font-bold text-primary">{finalScore}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments with Speech-to-Text */}
          <Card className="border-border/50 bg-card/80">
            <CardContent className="pt-4">
              <SpeechComments
                value={comments}
                onChange={setComments}
                disabled={isCertified}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          {!isCertified && (
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={upsert.isPending || !allScored}
                className="flex-1"
                variant="outline"
              >
                <Save className="h-4 w-4 mr-1" />
                {upsert.isPending ? "Saving…" : "Save Draft"}
              </Button>
              <Button
                onClick={() => {
                  if (!existingScore?.id) {
                    toast({ title: "Save first", description: "Save your scores before certifying", variant: "destructive" });
                    return;
                  }
                  setShowCertifyDialog(true);
                }}
                disabled={!allScored || !existingScore?.id}
                className="flex-1"
              >
                <Lock className="h-4 w-4 mr-1" /> Certify & Lock
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {/* Certify Dialog */}
      <Dialog open={showCertifyDialog} onOpenChange={setShowCertifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Certify Scorecard</DialogTitle>
            <DialogDescription>
              Sign below to certify this scorecard. Once certified, scores cannot be changed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-md bg-primary/10 border border-primary/20">
              <AlertTriangle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-foreground">
                By signing, you confirm that all scores are accurate and final. This action is irreversible.
              </p>
            </div>

            <div className="text-sm space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Raw Total</span><span className="font-mono">{rawTotal}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Time Penalty</span><span className="font-mono text-destructive">-{timePenalty}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground border-t border-border pt-1 mt-1">
                <span>Final Score</span><span className="font-mono text-primary">{finalScore}</span>
              </div>
            </div>

            <SignaturePad label="Judge Signature" onSignature={setSignature} />

            <Button
              onClick={handleCertify}
              disabled={!signature || certify.isPending}
              className="w-full"
            >
              <Lock className="h-4 w-4 mr-1" />
              {certify.isPending ? "Certifying…" : "Certify Scorecard"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
