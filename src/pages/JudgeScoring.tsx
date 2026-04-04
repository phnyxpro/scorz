import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { ArrowLeft, Save, Lock, CheckCircle, AlertTriangle, Info, User, PanelLeftClose, PanelLeft, MessageSquare, Search, RotateCcw, ChevronRight, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { EventChat } from "@/components/chat/EventChat";
import { useChatUnreadCount } from "@/hooks/useEventChat";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { PublicRubric } from "@/components/public/PublicRubric";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { ConnectionIndicator } from "@/components/shared/ConnectionIndicator";
import { SpecialAwardsVoting } from "@/components/competition/SpecialAwardsVoting";
import { useSpecialAwards } from "@/components/competition/SpecialAwardsManager";
import { ContestantInfoCard } from "@/components/shared/ContestantInfoCard";
import { migrateFormConfig, getScorecardFields, getScorecardLayout } from "@/lib/form-builder-types";

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

  // Offline support
  const offlineCache = useOfflineCache(competitionId);
  const offlineQueue = useOfflineQueue();
  const { data: specialAwards } = useSpecialAwards(competitionId);
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const selectedLevel = levels?.find(l => l.id === selectedLevelId) as any;
  const [selectedSubEventId, setSelectedSubEventId] = useState(searchParams.get("sub_event") || "");
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [contestantSearch, setContestantSearch] = useState("");
  const [showChatModal, setShowChatModal] = useState(false);
  const unreadCount = useChatUnreadCount(competitionId);

  // Use active scoring config if available — for category levels, auto-select the umbrella sub-event
  useEffect(() => {
    if (!comp || searchParams.get("sub_event")) return;
    if (comp.active_scoring_level_id) {
      setSelectedLevelId(comp.active_scoring_level_id);
      if (comp.active_scoring_sub_event_id) {
        setSelectedSubEventId(comp.active_scoring_sub_event_id);
      }
    }
  }, [comp?.active_scoring_level_id, comp?.active_scoring_sub_event_id, searchParams]);

  if (levels?.length && !selectedLevelId) setSelectedLevelId(levels[0].id);

  const { data: allSubEvents } = useSubEvents(selectedLevelId || undefined);

  // For category-type levels, auto-select the single umbrella sub-event
  const isCategoryLevel = selectedLevel?.structure_type === "categories";
  useEffect(() => {
    if (isCategoryLevel && allSubEvents?.length && !selectedSubEventId) {
      const umbrella = allSubEvents[0];
      if (umbrella) setSelectedSubEventId(umbrella.id);
    }
  }, [isCategoryLevel, allSubEvents, selectedSubEventId]);

  const subEvents = useMemo(() => {
    if (!allSubEvents || !myAssignments) return [];
    // For category levels, show all sub-events (umbrella); otherwise filter by assignment
    if (isCategoryLevel) return allSubEvents;
    const assignedIds = new Set(myAssignments.map((a) => a.sub_event_id));
    return allSubEvents.filter((se) => assignedIds.has(se.id));
  }, [allSubEvents, myAssignments, isCategoryLevel]);

  const selectedSubEvent = subEvents.find(se => se.id === selectedSubEventId);
  const timerVisible = selectedSubEvent?.timer_visible ?? true;
  const commentsVisible = selectedSubEvent?.comments_visible ?? true;
  const profileDetailsVisible = (selectedSubEvent as any)?.profile_details_visible ?? true;
  const videoVisible = (selectedSubEvent as any)?.video_visible ?? true;

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
  const [viewMode, setViewMode] = useState<"slider" | "table">("slider");
  const [showCertifyDialog, setShowCertifyDialog] = useState(false);
  const [showCertifyAllDialog, setShowCertifyAllDialog] = useState(false);
  const [showCertifyBatchDialog, setShowCertifyBatchDialog] = useState(false);
  const [signature, setSignature] = useState("");
  const [certifyConfirmed, setCertifyConfirmed] = useState(false);
  const [onStageContestant, setOnStageContestant] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [selectedForBatch, setSelectedForBatch] = useState<Set<string>>(new Set());
  const [certifyAllPending, setCertifyAllPending] = useState(false);
  const [hasOfflineCache, setHasOfflineCache] = useState(false);

  // Swipe gesture state
  const touchStartX = useRef<number | null>(null);
  const [swipeHintVisible, setSwipeHintVisible] = useState(true);

  const timeLimitSecs = penalties?.[0]?.time_limit_seconds ?? 240;
  const gracePeriodSecs = penalties?.[0]?.grace_period_seconds ?? 15;

  // Filtered contestants for the selected sub-event
  const filteredContestants = useMemo(() => {
    const list = registrations?.filter(r => r.status === "approved" && (!subEventId || r.sub_event_id === subEventId || !r.sub_event_id)) ?? [];
    const sorted = [...list].sort((a, b) => ((a as any).sort_order || 0) - ((b as any).sort_order || 0));
    if (!contestantSearch.trim()) return sorted;
    const q = contestantSearch.toLowerCase();
    return sorted.filter(r => r.full_name.toLowerCase().includes(q));
  }, [registrations, subEventId, contestantSearch]);

  // For category-type levels, compute grouped contestants by Category field
  const formConfig = useMemo(() => comp ? migrateFormConfig((comp as any).registration_form_config) : null, [comp]);

  // Fetch categories for the selected level to resolve UUIDs to names
  const { data: levelCategories } = useQuery({
    queryKey: ["competition_categories", selectedLevelId],
    enabled: !!selectedLevelId && isCategoryLevel,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competition_categories")
        .select("id, name")
        .eq("level_id", selectedLevelId);
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  // Build a value resolver: raw value → human-readable label
  // Covers: category/subcategory UUIDs, level UUIDs, dropdown/radio option values
  const valueResolver = useMemo(() => {
    const map = new Map<string, string>();
    // Category UUIDs → names
    for (const cat of levelCategories || []) {
      map.set(cat.id, cat.name);
    }
    // Level UUIDs → names
    for (const lv of levels || []) {
      map.set(lv.id, lv.name);
    }
    // Dropdown / radio option values → labels
    if (formConfig) {
      for (const field of formConfig.fields) {
        if (field.options?.length) {
          for (const opt of field.options) {
            if (opt.value && opt.label && opt.value !== opt.label) {
              map.set(opt.value, opt.label);
            }
          }
        }
      }
    }
    return map;
  }, [levelCategories, levels, formConfig]);

  const resolveValue = useCallback((raw: string) => valueResolver.get(raw) || raw, [valueResolver]);

  // Discover hierarchy field IDs dynamically from form config
  const hierarchyFieldIds = useMemo(() => {
    if (!formConfig || !isCategoryLevel) return { category: null, subcategories: [] as string[], danceStyleIds: [] as string[] };
    const catField = formConfig.fields.find(f => f.field_type === "category_selector")?.id || null;
    // subcategory_selectors in order (Division, Age Group, etc.)
    const subFields = formConfig.fields
      .filter(f => f.field_type === "subcategory_selector")
      .map(f => f.id);
    // All dance style fields for subtitle display
    const danceFields = formConfig.fields
      .filter(f => f.show_on_scorecard && /^dance\s*style/i.test(f.label))
      .map(f => f.id);
    return { category: catField, subcategories: subFields, danceStyleIds: danceFields };
  }, [formConfig, isCategoryLevel]);

  const categoryFieldId = hierarchyFieldIds.category;

  // Build nested tree: Category → Division → Age Group with contestants at leaves
  interface ContestantGroup {
    label: string;
    depth: number;
    contestants: typeof filteredContestants;
    children: ContestantGroup[];
  }

  const groupedTree = useMemo((): ContestantGroup[] | null => {
    if (!isCategoryLevel || !categoryFieldId) return null;
    const allFieldIds = [categoryFieldId, ...hierarchyFieldIds.subcategories];

    function buildLevel(items: typeof filteredContestants, fieldIdx: number, depth: number): ContestantGroup[] {
      if (fieldIdx >= allFieldIds.length) return [];
      const fieldId = allFieldIds[fieldIdx];
      const buckets = new Map<string, typeof filteredContestants>();
      for (const r of items) {
        const cfv = (r as any).custom_field_values || {};
        const val = String(cfv[fieldId] || "Other");
        if (!buckets.has(val)) buckets.set(val, []);
        buckets.get(val)!.push(r);
      }
      const groups: ContestantGroup[] = [];
      for (const [rawLabel, members] of buckets) {
        const children = buildLevel(members, fieldIdx + 1, depth + 1);
        groups.push({ label: resolveValue(rawLabel), depth, contestants: members, children });
      }
      return groups;
    }

    return buildLevel(filteredContestants, 0, 0);
  }, [isCategoryLevel, categoryFieldId, hierarchyFieldIds.subcategories, filteredContestants, resolveValue]);

  // Helper to get contestant subtitle (dance name)
  const getContestantSubtitle = useCallback((r: any) => {
    if (!isCategoryLevel) return null;
    const cfv = r.custom_field_values || {};
    // Find first non-empty dance style value
    for (const dsId of hierarchyFieldIds.danceStyleIds) {
      if (cfv[dsId]) return resolveValue(String(cfv[dsId]));
    }
    return null;
  }, [isCategoryLevel, hierarchyFieldIds.danceStyleIds, resolveValue]);

  // Track collapsed state per group path
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroupCollapse = useCallback((path: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  // Convert legacy numeric-index criterion_scores to UUID keys
  const normalizeCriterionScores = useCallback((raw: Record<string, number>): Record<string, number> => {
    if (!raw || !rubric?.length) return raw || {};
    const keys = Object.keys(raw);
    if (!keys.length) return raw;
    // If first key looks like a UUID, no conversion needed
    if (keys[0].includes("-")) return raw;
    // Legacy format: keys are "0","1",... mapping to rubric sort_order indices
    const sorted = [...rubric].sort((a, b) => a.sort_order - b.sort_order);
    const converted: Record<string, number> = {};
    for (const [idx, val] of Object.entries(raw)) {
      const criterion = sorted[parseInt(idx, 10)];
      if (criterion) converted[criterion.id] = val;
    }
    return converted;
  }, [rubric]);

  useEffect(() => {
    if (existingScore) {
      setScores(normalizeCriterionScores(existingScore.criterion_scores || {}));
      setDuration(existingScore.performance_duration_seconds || 0);
      setComments(existingScore.comments || "");
    } else {
      setScores({});
      setDuration(0);
      setComments("");
    }
  }, [existingScore, normalizeCriterionScores]);

  // Auto-populate duration from tabulator recordings (avg across tabulators)
  useEffect(() => {
    if (selectedContestant && perfDurations && !existingScore?.performance_duration_seconds) {
      const avg = getAvgDuration(perfDurations, selectedContestant);
      if (avg > 0) setDuration(avg);
    }
  }, [selectedContestant, perfDurations, existingScore?.performance_duration_seconds]);

  const calculatePenalty = useCallback((durationSecs: number): number => {
    if (!penalties?.length) return 0;
    const rounded = Math.floor(durationSecs);
    const overTime = rounded - timeLimitSecs - gracePeriodSecs;
    if (overTime <= 0) return 0;
    let totalPenalty = 0;
    for (const rule of penalties) {
      if (rounded >= rule.from_seconds) {
        if (!rule.to_seconds || rounded <= rule.to_seconds) {
          totalPenalty = Math.max(totalPenalty, rule.penalty_points);
        }
      }
    }
    return totalPenalty;
  }, [penalties, timeLimitSecs, gracePeriodSecs]);

  // Scale labels and filtered rubric for category-specific criteria
  const compScaleLabels = (comp as any)?.rubric_scale_labels as import("@/hooks/useCompetitions").RubricScaleLabels | undefined;
  const scaleMin = compScaleLabels?.min ?? 1;
  const scaleMax = compScaleLabels?.max ?? 5;

  // Filter rubric by contestant's category (if applies_to_categories is set)
  const selectedContestantReg = filteredContestants.find(r => r.id === selectedContestant);
  const contestantSubEventId = selectedContestantReg?.sub_event_id;
  const filteredRubric = useMemo(() => {
    if (!rubric) return [];
    return rubric.filter(c => {
      if (!c.applies_to_categories || c.applies_to_categories.length === 0) return true;
      // Show if contestant's sub_event matches any category's linked sub_event
      // For simplicity, always show if we can't determine category
      return true;
    });
  }, [rubric, contestantSubEventId]);

  const rawTotal = Object.values(scores).reduce((a, b) => a + b, 0);
  const timePenalty = calculatePenalty(duration);
  const finalScore = Math.max(0, rawTotal - timePenalty);
  const isCertified = existingScore?.is_certified ?? false;

  const handleSave = async (silent = false) => {
    if (!user || !subEventId || !selectedContestant) return;
    const payload = {
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
    } as any;
    try {
      await upsert.mutateAsync(payload);
      // Clear any offline cache for this contestant on success
      const cacheKey = `scorz_pending_scores_${user.id}_${subEventId}_${selectedContestant}`;
      localStorage.removeItem(cacheKey);
      setHasOfflineCache(Object.keys(localStorage).some(k => k.startsWith("scorz_pending_scores_")));
      if (!silent) toast({ title: "Score saved" });
    } catch (err) {
      // Network failure — cache locally
      const cacheKey = `scorz_pending_scores_${user.id}_${subEventId}_${selectedContestant}`;
      localStorage.setItem(cacheKey, JSON.stringify(payload));
      setHasOfflineCache(true);
      if (!silent) toast({ title: "Saved locally", description: "Will sync when back online", variant: "destructive" });
    }
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

  const allScored = filteredRubric.length > 0 ? filteredRubric.every(c => scores[c.id] > 0) : false;

  // Offline cache: save to localStorage on network failure, flush on reconnect
  const CACHE_KEY = `scorz_pending_scores_${user?.id}_${subEventId}_${selectedContestant}`;

  const flushOfflineCache = useCallback(async () => {
    if (!user || !subEventId) return;
    const keys = Object.keys(localStorage).filter(k => k.startsWith("scorz_pending_scores_"));
    for (const key of keys) {
      try {
        const cached = JSON.parse(localStorage.getItem(key) || "");
        await upsert.mutateAsync(cached);
        localStorage.removeItem(key);
      } catch { /* will retry next time */ }
    }
    setHasOfflineCache(Object.keys(localStorage).some(k => k.startsWith("scorz_pending_scores_")));
  }, [user, subEventId, upsert]);

  useEffect(() => {
    // Check for offline cache on mount
    setHasOfflineCache(Object.keys(localStorage).some(k => k.startsWith("scorz_pending_scores_")));

    const handleOnline = () => { flushOfflineCache(); };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [flushOfflineCache]);

  // Check if all contestants have drafts (scored but not all certified)
  const allContestantsDrafted = useMemo(() => {
    if (!filteredContestants.length || !myScores?.length) return false;
    const hasUncertified = filteredContestants.some(r => scoreStatusMap.get(r.id) === "scored");
    if (!hasUncertified) return false;
    return filteredContestants.every(r => scoreStatusMap.has(r.id));
  }, [filteredContestants, myScores, scoreStatusMap]);

  // Selectable contestants for batch certify (scored but not yet certified)
  const batchEligible = useMemo(() => {
    return new Set(filteredContestants.filter(r => scoreStatusMap.get(r.id) === "scored").map(r => r.id));
  }, [filteredContestants, scoreStatusMap]);

  const toggleBatchSelect = (id: string) => {
    setSelectedForBatch(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedForBatch.size === batchEligible.size) {
      setSelectedForBatch(new Set());
    } else {
      setSelectedForBatch(new Set(batchEligible));
    }
  };

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

  const handleCertifyBatch = async () => {
    if (!signature || !certifyConfirmed || !myScores) return;
    setCertifyAllPending(true);
    try {
      const toCertify = myScores.filter(s => !s.is_certified && selectedForBatch.has(s.contestant_registration_id));
      for (const score of toCertify) {
        await certify.mutateAsync({
          id: score.id,
          judge_signature: signature,
          sub_event_id: score.sub_event_id,
          contestant_registration_id: score.contestant_registration_id,
        });
      }
      setShowCertifyBatchDialog(false);
      setSelectedForBatch(new Set());
      toast({ title: `${toCertify.length} scorecard(s) certified` });
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
          {!isCategoryLevel && (
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
          )}
        </div>

        {/* Contestant list */}
        {selectedSubEventId && (
          <>
            <div className="px-3 pt-1 pb-1.5 border-t border-border/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Contestants ({filteredContestants.length})
                </span>
                {batchEligible.size > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    className="text-[10px] text-primary hover:underline"
                  >
                    {selectedForBatch.size === batchEligible.size ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <input
                  type="text"
                  value={contestantSearch}
                  onChange={(e) => setContestantSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full h-7 pl-7 pr-2 text-xs rounded-md border border-border/50 bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-2 pb-3 space-y-0.5">
                {groupedTree ? (
                  /* Nested grouped view for category-type levels */
                  (() => {
                    let globalIdx = 0;
                    const renderGroup = (group: ContestantGroup, parentPath: string): React.ReactNode => {
                      const path = parentPath ? `${parentPath}/${group.label}` : group.label;
                      const isCollapsed = collapsedGroups.has(path);
                      const isLeaf = group.children.length === 0;
                      const depthColors = ["text-primary", "text-accent-foreground", "text-muted-foreground"];
                      const colorClass = depthColors[Math.min(group.depth, depthColors.length - 1)];
                      const depthPadding = group.depth * 8;

                      return (
                        <div key={path} className="mb-1">
                          <button
                            onClick={() => toggleGroupCollapse(path)}
                            className={cn(
                              "sticky z-10 bg-card/95 backdrop-blur-sm w-full flex items-center gap-1.5 py-1.5 border-b border-border/20 mb-0.5 text-left hover:bg-muted/30 rounded-sm",
                              group.depth === 0 ? "top-0 z-20 px-2" : "px-2"
                            )}
                            style={{ paddingLeft: `${8 + depthPadding}px` }}
                          >
                            {!isLeaf && (
                              isCollapsed
                                ? <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                : <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                            )}
                            <span className={cn(
                              "font-semibold uppercase tracking-wider",
                              group.depth === 0 ? "text-[10px]" : "text-[9px]",
                              colorClass
                            )}>
                              {group.label}
                            </span>
                            <span className="text-[9px] text-muted-foreground">({group.contestants.length})</span>
                          </button>

                          {!isCollapsed && (
                            <>
                              {isLeaf ? (
                                /* Render contestants at leaf level */
                                group.contestants.map((r) => {
                                  const currentIdx = globalIdx++;
                                  const subtitle = getContestantSubtitle(r);
                                  return (
                                    <div key={r.id} className="flex items-center gap-1" style={{ paddingLeft: `${depthPadding}px` }}>
                                      {batchEligible.has(r.id) && (
                                        <Checkbox
                                          checked={selectedForBatch.has(r.id)}
                                          onCheckedChange={() => toggleBatchSelect(r.id)}
                                          className="h-3.5 w-3.5 shrink-0 ml-1"
                                        />
                                      )}
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
                                          {currentIdx + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          <span className="truncate text-xs block">{r.full_name}</span>
                                          {subtitle && (
                                            <span className="truncate text-[10px] text-muted-foreground block">{subtitle}</span>
                                          )}
                                        </div>
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
                                  );
                                })
                              ) : (
                                /* Render child groups */
                                group.children.map(child => renderGroup(child, path))
                              )}
                            </>
                          )}
                        </div>
                      );
                    };
                    return groupedTree.map(group => renderGroup(group, ""));
                  })()
                ) : (
                  /* Flat list for sub-event-type levels */
                  filteredContestants.map((r, idx) => (
                    <div key={r.id} className="flex items-center gap-1">
                      {batchEligible.has(r.id) && (
                        <Checkbox
                          checked={selectedForBatch.has(r.id)}
                          onCheckedChange={() => toggleBatchSelect(r.id)}
                          className="h-3.5 w-3.5 shrink-0 ml-1"
                        />
                      )}
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
                  ))
                )}
                {filteredContestants.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-4 text-center">No contestants</p>
                )}
              </div>
            </ScrollArea>
            {selectedForBatch.size > 0 && (
              <div className="px-3 py-2 border-t border-border/30">
                <Button
                  onClick={() => { setSignature(""); setCertifyConfirmed(false); setShowCertifyBatchDialog(true); }}
                  size="sm"
                  className="w-full h-8 text-xs"
                >
                  <Lock className="h-3 w-3 mr-1" /> Certify Selected ({selectedForBatch.size})
                </Button>
              </div>
            )}
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
          {/* Offline Banner */}
          <OfflineBanner
            isSyncing={offlineCache.isSyncing}
            syncProgress={offlineCache.syncProgress}
            lastSyncedAt={offlineCache.lastSyncedAt}
            isReady={offlineCache.isReady}
            pendingCount={offlineQueue.pendingCount}
            isFlushing={offlineQueue.isFlushing}
            flushErrors={offlineQueue.flushErrors}
            onRetry={offlineQueue.retry}
          />
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
              <h1 className="text-lg sm:text-xl font-bold text-foreground truncate flex items-center gap-2">
                Judge Scoring
                <ConnectionIndicator pendingCount={offlineQueue.pendingCount} isOfflineReady={offlineCache.isReady} />
              </h1>
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

              {/* Video link from custom fields */}
              {videoVisible && (() => {
                const cfg = migrateFormConfig((comp as any)?.registration_form_config);
                const urlFields = getScorecardFields(cfg).filter(f => f.field_type === "url");
                const cfv = (selectedContestantReg as any)?.custom_field_values || {};
                const videoUrl = urlFields.map(f => cfv[f.id]).find(v => v && String(v).trim());
                if (!videoUrl) return null;
                const url = String(videoUrl).trim();

                // YouTube embed
                const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
                if (ytMatch) {
                  return (
                    <div className="rounded-lg overflow-hidden border border-border/50 bg-card/80">
                      <iframe
                        src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                        className="w-full aspect-video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Performance Video"
                      />
                    </div>
                  );
                }

                // Google Drive embed — extract file ID and use preview URL
                const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
                if (driveMatch) {
                  return (
                    <div className="rounded-lg overflow-hidden border border-border/50 bg-card/80">
                      <iframe
                        src={`https://drive.google.com/file/d/${driveMatch[1]}/preview`}
                        className="w-full aspect-video"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                        title="Performance Video"
                      />
                    </div>
                  );
                }

                // Fallback — clickable link
                return (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/50 bg-card/80 text-primary hover:bg-primary/5 transition-colors text-sm">
                    <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">▶</span>
                    <span className="truncate">Watch Performance</span>
                  </a>
                );
              })()}

              {/* Profile details — 3-column sub-cards below video */}
              {profileDetailsVisible && selectedContestantReg && (
                <ContestantInfoCard
                  formConfig={(comp as any)?.registration_form_config}
                  customFieldValues={(selectedContestantReg as any)?.custom_field_values || {}}
                />
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
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-base">Scoring Card</CardTitle>
                      <CardDescription>Rate each criterion from {scaleMin} to {scaleMax} (intervals of 0.1)</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <Switch checked={viewMode === "table"} onCheckedChange={(v) => setViewMode(v ? "table" : "slider")} disabled={isCertified} />
                        Table
                      </label>
                      {!isCertified && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => {
                            if (window.confirm("Clear all scores for this contestant? This cannot be undone.")) {
                              setScores({});
                              setDuration(0);
                              setComments("");
                            }
                          }}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {viewMode === "slider" ? (
                    filteredRubric?.map(criterion => (
                      <CriterionSlider
                        key={criterion.id}
                        criterion={criterion}
                        value={scores[criterion.id] || 0}
                        onChange={v => setScores(prev => ({ ...prev, [criterion.id]: v }))}
                        disabled={isCertified}
                        scaleLabels={compScaleLabels}
                      />
                    ))
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Criterion</TableHead>
                          <TableHead className="text-xs w-24 text-center">Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRubric?.map(criterion => (
                          <TableRow key={criterion.id}>
                            <TableCell className="text-sm font-medium py-2">{criterion.name}</TableCell>
                            <TableCell className="py-2">
                              <Input
                                type="number"
                                inputMode="decimal"
                                min={0.1}
                                max={scaleMax}
                                step={0.1}
                                value={scores[criterion.id] || ""}
                                onChange={(e) => {
                                  const num = parseFloat(e.target.value);
                                  if (isNaN(num)) return;
                                  const clamped = Math.min(scaleMax, Math.max(0.1, Math.round(num * 10) / 10));
                                  setScores(prev => ({ ...prev, [criterion.id]: clamped }));
                                }}
                                disabled={isCertified}
                                className="w-20 h-8 text-center font-mono text-sm"
                                placeholder="–"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/80">
                <CardContent className="pt-3 sm:pt-4 pb-3 sm:pb-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Raw Total</p>
                    <p className="text-2xl font-mono font-bold text-foreground">{rawTotal.toFixed(2)}</p>
                    {hasOfflineCache && (
                      <p className="text-[10px] text-destructive mt-1 flex items-center justify-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Offline — saved locally
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ContestantInfoCard moved above timer, after video embed */}

              {commentsVisible && (
                <Card className="border-border/50 bg-card/80">
                  <CardContent className="pt-4">
                    <SpeechComments value={comments} onChange={setComments} disabled={isCertified} />
                  </CardContent>
                </Card>
              )}

              {/* Special Awards Voting — final rounds only */}
              {selectedLevel?.is_final_round && specialAwards && specialAwards.length > 0 && (
                <SpecialAwardsVoting
                  awards={specialAwards}
                  competitionId={competitionId!}
                  subEventId={subEventId}
                  contestants={filteredContestants.map(r => ({ id: r.id, full_name: r.full_name }))}
                  disabled={isCertified}
                />
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
                <span>Raw Total</span><span className="font-mono">{rawTotal.toFixed(2)}</span>
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

      {/* Certify Batch Dialog */}
      <Dialog open={showCertifyBatchDialog} onOpenChange={(open) => { setShowCertifyBatchDialog(open); if (!open) { setCertifyConfirmed(false); setSignature(""); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Certify Selected Scorecards</DialogTitle>
            <DialogDescription>
              Sign once to certify {selectedForBatch.size} selected scorecard(s). This action is irreversible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-md bg-primary/10 border border-primary/20">
              <AlertTriangle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-foreground">
                By signing, you confirm that the scores for the selected contestants are accurate and final.
              </p>
            </div>
            <div className="rounded-md border border-border/50 p-2 max-h-32 overflow-y-auto">
              <ul className="space-y-0.5">
                {filteredContestants.filter(r => selectedForBatch.has(r.id)).map(r => (
                  <li key={r.id} className="text-xs text-foreground flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-muted-foreground shrink-0" />
                    {r.full_name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="certify-batch-confirm"
                checked={certifyConfirmed}
                onCheckedChange={(v) => setCertifyConfirmed(v === true)}
              />
              <label htmlFor="certify-batch-confirm" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                I have reviewed the scores for the selected contestants and confirm they are accurate. I understand this action is irreversible.
              </label>
            </div>
            <SignaturePad label="Judge Signature" onSignature={setSignature} signerRole="Judge" />
            <Button onClick={handleCertifyBatch} disabled={!signature || !certifyConfirmed || certifyAllPending} className="w-full">
              <Lock className="h-4 w-4 mr-1" />
              {certifyAllPending ? "Certifying…" : `Certify ${selectedForBatch.size} Scorecard(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Chat Modal */}
      <Dialog open={showChatModal} onOpenChange={setShowChatModal}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Event Chat</DialogTitle>
            <DialogDescription>Chat with competition staff</DialogDescription>
          </DialogHeader>
          {competitionId && <EventChat competitionId={competitionId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
