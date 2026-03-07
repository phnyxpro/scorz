import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompetition, useLevels, useSubEvents, useRubricCriteria, usePenaltyRules } from "@/hooks/useCompetitions";
import { useRegistrations, useRegistrationsRealtime } from "@/hooks/useRegistrations";
import { useMyScores, useMyScoreForContestant, useUpsertScore, useCertifyScore, useJudgeScoresRealtime } from "@/hooks/useJudgeScores";
import { useMyAssignedSubEvents } from "@/hooks/useSubEventAssignments";
import { PerformanceTimer } from "@/components/scoring/PerformanceTimer";
import { ReadOnlyTimer } from "@/components/scoring/ReadOnlyTimer";
import { usePerformanceDurations, useDurationsRealtime, getAvgDuration, useLatestTimerEvent, useTimerEventsRealtime } from "@/hooks/usePerformanceTimer";
import { CriterionSlider } from "@/components/scoring/CriterionSlider";
import { SpeechComments } from "@/components/scoring/SpeechComments";
import { SignaturePad } from "@/components/registration/SignaturePad";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Save, Lock, CheckCircle, AlertTriangle, Info, User, PanelLeftClose, PanelLeft, MessageSquare } from "lucide-react";
import { EventChat } from "@/components/chat/EventChat";
import { useChatUnreadCount } from "@/hooks/useEventChat";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { PublicRubric } from "@/components/public/PublicRubric";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

export default function JudgeScoring() {
  const { id: competitionId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isMobile = useIsMobile();

  const { data: comp } = useCompetition(competitionId);
  const { data: levels } = useLevels(competitionId);
  const { data: rubric } = useRubricCriteria(competitionId);
  const { data: penalties } = usePenaltyRules(competitionId);
  const { data: registrations } = useRegistrations(competitionId);
  useRegistrationsRealtime(competitionId);
  const { data: myAssignments } = useMyAssignedSubEvents("judge");

  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [selectedSubEventId, setSelectedSubEventId] = useState(searchParams.get("sub_event") || "");
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [showChatModal, setShowChatModal] = useState(false);
  const unreadCount = useChatUnreadCount(competitionId);

  // Use active scoring config if available
  useEffect(() => {
    if (comp?.active_scoring_level_id && comp?.active_scoring_sub_event_id && !searchParams.get("sub_event")) {
      setSelectedLevelId(comp.active_scoring_level_id);
      setSelectedSubEventId(comp.active_scoring_sub_event_id);
    }
  }, [comp?.active_scoring_level_id, comp?.active_scoring_sub_event_id, searchParams]);

  if (levels?.length && !selectedLevelId) setSelectedLevelId(levels[0].id);

  const { data: allSubEvents } = useSubEvents(selectedLevelId || undefined);

  const subEvents = useMemo(() => {
    if (!allSubEvents || !myAssignments) return [];
    const assignedIds = new Set(myAssignments.map((a) => a.sub_event_id));
    return allSubEvents.filter((se) => assignedIds.has(se.id));
  }, [allSubEvents, myAssignments]);

  const selectedSubEvent = subEvents.find(se => se.id === selectedSubEventId);
  const timerVisible = selectedSubEvent?.timer_visible ?? true;
  const commentsVisible = selectedSubEvent?.comments_visible ?? true;

  const subEventId = selectedSubEventId;
  useJudgeScoresRealtime(subEventId || undefined);
  const { data: myScores } = useMyScores(subEventId || undefined);
  const { data: perfDurations } = usePerformanceDurations(subEventId || undefined);
  useDurationsRealtime(subEventId || undefined);
  const { data: latestTimerEvent } = useLatestTimerEvent(subEventId || undefined);
  useTimerEventsRealtime(subEventId || undefined);

  // Auto-sync on-stage contestant from tabulator broadcast
  useEffect(() => {
    if (!latestTimerEvent) return;
    const { event_type, contestant_registration_id } = latestTimerEvent;
    if (event_type === "on_stage" || event_type === "start") {
      setOnStageContestant(contestant_registration_id);
      setIsLive(event_type === "start");
    } else if (event_type === "off_stage" || event_type === "stop") {
      if (event_type === "off_stage") setOnStageContestant(null);
      setIsLive(false);
    }
  }, [latestTimerEvent?.id]);

  // Build lookup: contestant_registration_id -> score status
  const scoreStatusMap = useMemo(() => {
    const map = new Map<string, "scored" | "certified">();
    for (const s of myScores || []) {
      map.set(s.contestant_registration_id, s.is_certified ? "certified" : "scored");
    }
    return map;
  }, [myScores]);

  const [selectedContestant, setSelectedContestant] = useState(searchParams.get("contestant") || "");
  const { data: existingScore, isLoading: scoreLoading } = useMyScoreForContestant(subEventId, selectedContestant || undefined);

  const upsert = useUpsertScore();
  const certify = useCertifyScore();

  const [scores, setScores] = useState<Record<string, number>>({});
  const [duration, setDuration] = useState(0);
  const [comments, setComments] = useState("");
  const [showCertifyDialog, setShowCertifyDialog] = useState(false);
  const [showCertifyAllDialog, setShowCertifyAllDialog] = useState(false);
  const [signature, setSignature] = useState("");
  const [certifyConfirmed, setCertifyConfirmed] = useState(false);
  const [onStageContestant, setOnStageContestant] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [certifyAllPending, setCertifyAllPending] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Swipe gesture state
  const touchStartX = useRef<number | null>(null);
  const [swipeHintVisible, setSwipeHintVisible] = useState(true);

  const timeLimitSecs = penalties?.[0]?.time_limit_seconds ?? 240;
  const gracePeriodSecs = penalties?.[0]?.grace_period_seconds ?? 15;

  // Filtered contestants for the selected sub-event
  const filteredContestants = useMemo(() => {
    const list = registrations?.filter(r => r.status !== "rejected" && (!subEventId || r.sub_event_id === subEventId || !r.sub_event_id)) ?? [];
    // Sort by sort_order (matches organiser's registration order)
    return [...list].sort((a, b) => ((a as any).sort_order || 0) - ((b as any).sort_order || 0));
  }, [registrations, subEventId]);

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

  // Auto-populate duration from tabulator recordings (avg across tabulators)
  useEffect(() => {
    if (selectedContestant && perfDurations && !existingScore?.performance_duration_seconds) {
      const avg = getAvgDuration(perfDurations, selectedContestant);
      if (avg > 0) setDuration(avg);
    }
  }, [selectedContestant, perfDurations, existingScore?.performance_duration_seconds]);

  const calculatePenalty = useCallback((durationSecs: number): number => {
    if (!penalties?.length) return 0;
    let totalPenalty = 0;
    const overTime = durationSecs - timeLimitSecs - gracePeriodSecs;
    if (overTime <= 0) return 0;
    for (const rule of penalties) {
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

  const handleSave = async (silent = false) => {
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
    if (!silent) toast({ title: "Score saved" });
  };

  const handleCertify = async () => {
    if (!existingScore?.id || !signature) return;
    try {
      await certify.mutateAsync({
        id: existingScore.id,
        judge_signature: signature,
        sub_event_id: subEventId,
        contestant_registration_id: selectedContestant,
      });
      setShowCertifyDialog(false);
    } catch (error) {
      console.error("Certification error:", error);
    }
  };

  const allScored = rubric ? rubric.every(c => scores[c.id] > 0) : false;

  // Debounced auto-save when scores change
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  useEffect(() => {
    if (!allScored || isCertified || !selectedContestant || !subEventId) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaveStatus("idle");
    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaveStatus("saving");
      try {
        await handleSaveRef.current(true);
        setAutoSaveStatus("saved");
        if (autoSaveStatusTimerRef.current) clearTimeout(autoSaveStatusTimerRef.current);
        autoSaveStatusTimerRef.current = setTimeout(() => setAutoSaveStatus("idle"), 2500);
      } catch {
        setAutoSaveStatus("idle");
      }
    }, 1200);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [scores, allScored, isCertified, selectedContestant, subEventId]);

  // Check if all contestants have drafts (scored but not all certified)
  const allContestantsDrafted = useMemo(() => {
    if (!filteredContestants.length || !myScores?.length) return false;
    const hasUncertified = filteredContestants.some(r => scoreStatusMap.get(r.id) === "scored");
    if (!hasUncertified) return false;
    return filteredContestants.every(r => scoreStatusMap.has(r.id));
  }, [filteredContestants, myScores, scoreStatusMap]);

  const handleCertifyAll = async () => {
    if (!signature || !certifyConfirmed || !myScores) return;
    setCertifyAllPending(true);
    try {
      const uncertified = myScores.filter(s => !s.is_certified);
      for (const score of uncertified) {
        await certify.mutateAsync({
          id: score.id,
          judge_signature: signature,
          sub_event_id: score.sub_event_id,
          contestant_registration_id: score.contestant_registration_id,
        });
      }
      setShowCertifyAllDialog(false);
      toast({ title: "All scorecards certified" });
    } catch (err: any) {
      toast({ title: "Error certifying", description: err.message, variant: "destructive" });
    } finally {
      setCertifyAllPending(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCertified) return;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isInput) return;

      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (allScored && !upsert.isPending) handleSave();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (allScored && existingScore?.id) setShowCertifyDialog(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCertified, allScored, upsert.isPending, existingScore, handleSave]);

  const selectedContestantName = filteredContestants.find(r => r.id === selectedContestant)?.full_name;

  return (
    <div className="flex -mx-3 sm:-mx-6 -mt-4 sm:-mt-6 min-h-[calc(100vh-theme(spacing.14))]">
      {/* Left sidebar / panel */}
      <aside
        className={cn(
          "flex-shrink-0 border-r border-border/50 bg-card/60 transition-all duration-200 flex flex-col",
          sidebarOpen ? "w-64" : "w-0 overflow-hidden",
          isMobile && sidebarOpen && "absolute inset-y-0 left-0 z-30 w-72 shadow-xl bg-card"
        )}
      >
        <div className="p-3 border-b border-border/30 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Navigation</h2>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSidebarOpen(false)}>
            <PanelLeftClose className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="p-3 space-y-3">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Level</label>
            <Select value={selectedLevelId} onValueChange={(v) => { setSelectedLevelId(v); setSelectedSubEventId(""); setSelectedContestant(""); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                {levels?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Sub-Event</label>
            <Select value={selectedSubEventId} onValueChange={(v) => { setSelectedSubEventId(v); setSelectedContestant(""); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select sub-event" /></SelectTrigger>
              <SelectContent>
                {subEvents.map((se) => <SelectItem key={se.id} value={se.id}>{se.name}</SelectItem>)}
                {subEvents.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No assigned sub-events</div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Contestant list */}
        {selectedSubEventId && (
          <>
            <div className="px-3 pt-1 pb-1.5 border-t border-border/30">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Contestants ({filteredContestants.length})
              </span>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-2 pb-3 space-y-0.5">
                {filteredContestants.map((r, idx) => (
                  <div key={r.id} className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedContestant(r.id);
                        if (isMobile) setSidebarOpen(false);
                      }}
                      className={cn(
                        "flex-1 flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors text-sm",
                        selectedContestant === r.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground/80 hover:bg-muted/50",
                        onStageContestant === r.id && "ring-1 ring-secondary/50 bg-secondary/5"
                      )}
                    >
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-muted text-[10px] font-mono font-bold text-muted-foreground shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate text-xs flex-1">{r.full_name}</span>
                      {onStageContestant === r.id && (
                        <span className="h-2 w-2 rounded-full bg-secondary shrink-0 animate-pulse" />
                      )}
                      {scoreStatusMap.get(r.id) === "certified" && (
                        <CheckCircle className="h-3.5 w-3.5 text-secondary shrink-0" />
                      )}
                      {scoreStatusMap.get(r.id) === "scored" && (
                        <Save className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  </div>
                ))}
                {filteredContestants.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-4 text-center">No contestants</p>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </aside>

      {/* Mobile overlay backdrop */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main scoring area */}
      <div
        className="flex-1 min-w-0 overflow-y-auto"
        onTouchStart={(e) => {
          if (!isMobile || filteredContestants.length < 2) return;
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (!isMobile || touchStartX.current === null || filteredContestants.length < 2 || isCertified) return;
          const diff = e.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(diff) < 50) return;
          setSwipeHintVisible(false);
          const currentIdx = filteredContestants.findIndex(r => r.id === selectedContestant);
          if (diff < 0 && currentIdx < filteredContestants.length - 1) {
            setSelectedContestant(filteredContestants[currentIdx + 1].id);
          } else if (diff > 0 && currentIdx > 0) {
            setSelectedContestant(filteredContestants[currentIdx - 1].id);
          }
        }}
      >
        <div className="px-3 sm:px-6 py-4 sm:py-6">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            {!sidebarOpen && (
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="shrink-0">
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => navigate(`/competitions/${competitionId}`)} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">Judge Scoring</h1>
              <p className="text-muted-foreground text-xs truncate">{comp?.name}</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onStageContestant === selectedContestant && selectedContestant && (
                <Badge variant="outline" className="shrink-0 gap-1 border-secondary/50 text-secondary">
                  <span className="h-2 w-2 rounded-full bg-secondary animate-pulse"></span>
                  On Stage
                </Badge>
              )}
              {isLive && onStageContestant === selectedContestant && (
                <Badge variant="default" className="shrink-0 gap-1 bg-destructive/20 text-destructive border border-destructive/30">
                  <span className="h-2 w-2 rounded-full bg-destructive animate-pulse"></span>
                  LIVE
                </Badge>
              )}
            {selectedContestantName && (
                <Badge variant="secondary" className="shrink-0 gap-1">
                  <User className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">{selectedContestantName}</span>
                </Badge>
              )}
              {isMobile && swipeHintVisible && selectedContestant && filteredContestants.length > 1 && (
                <span className="text-[10px] text-muted-foreground/60 font-mono">Swipe ← →</span>
              )}
              <Button variant="ghost" size="icon" className="relative shrink-0" onClick={() => setShowChatModal(true)}>
                <MessageSquare className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Rubric reference */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground mb-2">
                <Info className="h-3.5 w-3.5" /> <span className="hidden sm:inline">View Full Rubric & Penalties</span><span className="sm:hidden">Rubric</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-4">
              <PublicRubric criteria={rubric || []} penalties={penalties || []} />
            </CollapsibleContent>
          </Collapsible>

          {!selectedContestant && (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="py-12 text-center text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Select a contestant from the {isMobile ? "menu" : "sidebar"} to begin scoring</p>
              </CardContent>
            </Card>
          )}

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

              {timerVisible && subEventId && (
                <ReadOnlyTimer
                  subEventId={subEventId}
                  timeLimitSeconds={timeLimitSecs}
                  gracePeriodSeconds={gracePeriodSecs}
                  contestantName={(regId) => filteredContestants.find(r => r.id === regId)?.full_name ?? "Unknown"}
                />
              )}

              <Card className="border-border/50 bg-card/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Scoring Card</CardTitle>
                  <CardDescription>Rate each criterion from 1 to 5 (intervals of 0.1)</CardDescription>
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

              <Card className="border-border/50 bg-card/80">
                <CardContent className="pt-3 sm:pt-4 pb-3 sm:pb-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Raw Total</p>
                    <p className="text-2xl font-mono font-bold text-foreground">{rawTotal.toFixed(1)}</p>
                    {autoSaveStatus === "saving" && (
                      <p className="text-[10px] text-muted-foreground mt-1 animate-pulse">Saving…</p>
                    )}
                    {autoSaveStatus === "saved" && (
                      <p className="text-[10px] text-secondary mt-1 flex items-center justify-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Auto-saved
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {commentsVisible && (
                <Card className="border-border/50 bg-card/80">
                  <CardContent className="pt-4">
                    <SpeechComments value={comments} onChange={setComments} disabled={isCertified} />
                  </CardContent>
                </Card>
              )}

              {!isCertified && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button onClick={() => handleSave()} disabled={upsert.isPending || !allScored} className="flex-1 h-12 sm:h-10" variant="outline">
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
                      className="flex-1 h-12 sm:h-10"
                    >
                      <Lock className="h-4 w-4 mr-1" /> Certify & Lock
                    </Button>
                  </div>
                  {allContestantsDrafted && (
                    <Button
                      onClick={() => { setSignature(""); setCertifyConfirmed(false); setShowCertifyAllDialog(true); }}
                      variant="secondary"
                      className="w-full h-12 sm:h-10"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" /> Certify All Results
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Certify Dialog */}
      <Dialog open={showCertifyDialog} onOpenChange={(open) => { setShowCertifyDialog(open); if (!open) { setCertifyConfirmed(false); setSignature(""); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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
              <div className="flex justify-between font-bold text-foreground">
                <span>Raw Total</span><span className="font-mono">{rawTotal.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="certify-confirm"
                checked={certifyConfirmed}
                onCheckedChange={(v) => setCertifyConfirmed(v === true)}
              />
              <label htmlFor="certify-confirm" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                I have reviewed all scores and confirm they are accurate. I understand this action is irreversible.
              </label>
            </div>
            <SignaturePad label="Judge Signature" onSignature={setSignature} signerRole="Judge" />
            <Button onClick={handleCertify} disabled={!signature || !certifyConfirmed || certify.isPending} className="w-full">
              <Lock className="h-4 w-4 mr-1" />
              {certify.isPending ? "Certifying…" : "Certify Scorecard"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Certify All Dialog */}
      <Dialog open={showCertifyAllDialog} onOpenChange={(open) => { setShowCertifyAllDialog(open); if (!open) { setCertifyConfirmed(false); setSignature(""); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Certify All Scorecards</DialogTitle>
            <DialogDescription>
              Sign once to certify all {myScores?.filter(s => !s.is_certified).length ?? 0} remaining scorecards. This action is irreversible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-md bg-primary/10 border border-primary/20">
              <AlertTriangle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-foreground">
                By signing, you confirm that all scores across all contestants are accurate and final.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="certify-all-confirm"
                checked={certifyConfirmed}
                onCheckedChange={(v) => setCertifyConfirmed(v === true)}
              />
              <label htmlFor="certify-all-confirm" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                I have reviewed all scores for every contestant and confirm they are accurate. I understand this action is irreversible.
              </label>
            </div>
            <SignaturePad label="Judge Signature" onSignature={setSignature} signerRole="Judge" />
            <Button onClick={handleCertifyAll} disabled={!signature || !certifyConfirmed || certifyAllPending} className="w-full">
              <Lock className="h-4 w-4 mr-1" />
              {certifyAllPending ? "Certifying…" : "Certify All Scorecards"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
