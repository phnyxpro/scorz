import { useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaffDisplayNames } from "@/hooks/useStaffDisplayNames";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Trophy, Eye, EyeOff, ChevronRight, ChevronDown, Sheet } from "lucide-react";
import { calculateMethodScore } from "@/lib/scoring-methods";
import { exportGoogleSheets, type SheetRow } from "@/lib/export-utils";
import { migrateFormConfig } from "@/lib/form-builder-types";
import { ContestantInfoCard } from "@/components/shared/ContestantInfoCard";
import type { JudgeScore } from "@/hooks/useJudgeScores";

function useLevelsForCompetition(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["competition_levels_list", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competition_levels")
        .select("id, name, sort_order, is_final_round, advancement_count, structure_type")
        .eq("competition_id", competitionId!)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });
}

function useLeaderboardData(competitionId: string | undefined, levelId: string | null) {
  return useQuery({
    queryKey: ["leaderboard_data", competitionId, levelId],
    enabled: !!competitionId && !!levelId,
    queryFn: async () => {
      const { data: competition } = await supabase
        .from("competitions")
        .select("scoring_method, registration_form_config")
        .eq("id", competitionId!)
        .single();

      const { data: subEvents } = await supabase
        .from("sub_events")
        .select("id, name")
        .eq("level_id", levelId!)
        .order("event_date");

      const subEventIds = (subEvents || []).map((se) => se.id);
      if (!subEventIds.length) return { scoringMethod: "olympic", subEvents: [], registrations: [], scores: [], profiles: [], allJudgeIds: [], formConfig: null };

      const { data: registrations } = await supabase
        .from("contestant_registrations")
        .select("id, full_name, user_id, sub_event_id, custom_field_values")
        .eq("competition_id", competitionId!)
        .in("sub_event_id", subEventIds)
        .eq("status", "approved");

      const { data: scores } = await supabase
        .from("judge_scores")
        .select("*")
        .in("sub_event_id", subEventIds);

      const { data: assignments } = await supabase
        .from("sub_event_assignments")
        .select("user_id")
        .in("sub_event_id", subEventIds)
        .eq("role", "judge" as any);

      const assignedJudgeIds = new Set((assignments || []).map((a: any) => a.user_id));
      const scoringJudgeIds = (scores || []).map((s: any) => s.judge_id);
      for (const jId of scoringJudgeIds) assignedJudgeIds.add(jId);
      const judgeIds = [...assignedJudgeIds];

      const { data: profiles } = judgeIds.length
        ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", judgeIds)
        : { data: [] as any[] };

      return {
        scoringMethod: (competition as any)?.scoring_method || "olympic",
        subEvents: subEvents || [],
        registrations: registrations || [],
        scores: (scores || []) as JudgeScore[],
        profiles: profiles || [],
        allJudgeIds: judgeIds,
        formConfig: (competition as any)?.registration_form_config || null,
      };
    },
  });
}

function useLevelCategories(levelId: string | null, isCategoryLevel: boolean) {
  return useQuery({
    queryKey: ["competition_categories_all", levelId],
    enabled: !!levelId && isCategoryLevel,
    queryFn: async () => {
      const { data: topLevel, error: e1 } = await supabase
        .from("competition_categories")
        .select("id, name, parent_id")
        .eq("level_id", levelId!);
      if (e1) throw e1;
      if (!topLevel?.length) return [] as { id: string; name: string }[];

      let allCats = [...topLevel];
      let parentIds = topLevel.map(c => c.id);
      for (let depth = 0; depth < 3 && parentIds.length > 0; depth++) {
        const { data: children, error: e2 } = await supabase
          .from("competition_categories")
          .select("id, name, parent_id")
          .in("parent_id", parentIds);
        if (e2) throw e2;
        if (!children?.length) break;
        allCats = [...allCats, ...children];
        parentIds = children.map(c => c.id);
      }
      return allCats as { id: string; name: string }[];
    },
  });
}

function getRankBadge(rank: number, isFinalRound: boolean, advancementCount: number | null) {
  if (isFinalRound) {
    if (rank === 0) return <Badge className="bg-amber-500 text-white text-[10px] px-1.5">🥇 Champion</Badge>;
    if (rank === 1) return <Badge className="bg-gray-400 text-white text-[10px] px-1.5">🥈 2nd Place</Badge>;
    if (rank === 2) return <Badge className="bg-amber-700 text-white text-[10px] px-1.5">🥉 3rd Place</Badge>;
    return null;
  }
  if (advancementCount == null) return null;
  if (rank < advancementCount) return <Badge className="bg-emerald-600 text-white text-[10px] px-1.5">Advances</Badge>;
  if (rank === advancementCount || rank === advancementCount + 1) return <Badge className="bg-amber-500/80 text-white text-[10px] px-1.5">Standby</Badge>;
  return null;
}

interface RowData {
  regId: string;
  name: string;
  userId: string;
  subEventId: string | null;
  judgeScores: Record<string, { rawTotal: number; certified: boolean }>;
  allJudgesRawTotal: number;
  timePenalty: number;
  avgFinal: number;
  durationSeconds: number | null;
  customFieldValues: Record<string, any>;
}

interface ContestantGroup {
  label: string;
  depth: number;
  rows: RowData[];
  children: ContestantGroup[];
}

interface Props {
  competitionId: string;
}

export function LeaderboardSection({ competitionId }: Props) {
  const { data: levels, isLoading: levelsLoading } = useLevelsForCompetition(competitionId);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [showStatusStyling, setShowStatusStyling] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [exportFieldIds, setExportFieldIds] = useState<Set<string>>(new Set());

  const levelId = selectedLevelId || levels?.[0]?.id || null;
  const selectedLevel = levels?.find((l) => l.id === levelId);
  const isFinalRound = selectedLevel?.is_final_round || false;
  const advancementCount = isFinalRound ? null : (selectedLevel?.advancement_count ?? null);
  const isCategoryLevel = (selectedLevel as any)?.structure_type === "categories";

  const { data, isLoading } = useLeaderboardData(competitionId, levelId);
  const { data: levelCategories } = useLevelCategories(levelId, isCategoryLevel);

  const judgeUserIds = useMemo(() => {
    return data?.allJudgeIds || [...new Set((data?.scores || []).map((s) => s.judge_id as string))];
  }, [data?.allJudgeIds, data?.scores]);
  const profileMap = useStaffDisplayNames(judgeUserIds);

  const subEventMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const se of data?.subEvents || []) m.set(se.id, se.name);
    return m;
  }, [data?.subEvents]);

  const scoringMethod = data?.scoringMethod || "olympic";

  // Build value resolver for category UUIDs → names
  const valueResolver = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of levelCategories || []) map.set(cat.id, cat.name);
    return map;
  }, [levelCategories]);
  const resolveValue = useCallback((raw: string) => valueResolver.get(raw) || raw, [valueResolver]);

  // Discover hierarchy field IDs from form config
  const formConfig = useMemo(() => data?.formConfig ? migrateFormConfig(data.formConfig) : null, [data?.formConfig]);
  const hierarchyFieldIds = useMemo(() => {
    if (!formConfig || !isCategoryLevel) return { category: null, subcategories: [] as string[] };
    const catField = formConfig.fields.find(f => f.field_type === "category_selector")?.id || null;
    const subFields = formConfig.fields
      .filter(f => f.field_type === "subcategory_selector")
      .map(f => f.id);
    return { category: catField, subcategories: subFields };
  }, [formConfig, isCategoryLevel]);

  // Exportable profile/registration fields from form config
  const exportableFields = useMemo(() => {
    if (!formConfig) return [];
    return formConfig.fields
      .filter(f => !["category_selector", "subcategory_selector", "signature", "section_header"].includes(f.field_type))
      .map(f => ({ id: f.id, label: f.label }));
  }, [formConfig]);

  const toggleExportField = useCallback((fieldId: string) => {
    setExportFieldIds(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
  }, []);

  const rows = useMemo((): RowData[] => {
    if (!data) return [];
    return (data.registrations || [])
      .map((reg) => {
        const regScores = data.scores.filter((s) => s.contestant_registration_id === reg.id);
        const judgeScores: Record<string, { rawTotal: number; certified: boolean }> = {};
        for (const s of regScores) {
          judgeScores[s.judge_id] = { rawTotal: s.raw_total, certified: s.is_certified };
        }
        const certifiedScores = regScores.filter((s) => s.is_certified);
        const rawTotals = certifiedScores.map((s) => s.raw_total);
        const timePenalty = certifiedScores.length > 0 ? Math.max(...certifiedScores.map((s) => s.time_penalty)) : 0;
        const allJudgesRawTotal = rawTotals.reduce((a, b) => a + b, 0);
        const avgFinal = certifiedScores.length > 0 ? calculateMethodScore(scoringMethod, rawTotals, timePenalty) : 0;
        const durations = regScores.map((s) => s.performance_duration_seconds).filter((d): d is number => d != null && d > 0);
        const durationSeconds = durations.length > 0 ? Math.max(...durations) : null;
        return {
          regId: reg.id,
          name: reg.full_name,
          userId: reg.user_id,
          subEventId: reg.sub_event_id,
          judgeScores,
          allJudgesRawTotal,
          timePenalty,
          avgFinal,
          durationSeconds,
          customFieldValues: (reg as any).custom_field_values || {},
        };
      })
      .sort((a, b) => b.avgFinal - a.avgFinal || b.allJudgesRawTotal - a.allJudgesRawTotal);
  }, [data, scoringMethod]);

  // Build grouped tree for category levels
  const groupedTree = useMemo((): ContestantGroup[] | null => {
    if (!isCategoryLevel || !hierarchyFieldIds.category) return null;
    const allFieldIds = [hierarchyFieldIds.category, ...hierarchyFieldIds.subcategories];

    function buildLevel(items: RowData[], fieldIdx: number, depth: number): ContestantGroup[] {
      if (fieldIdx >= allFieldIds.length) return [];
      const fieldId = allFieldIds[fieldIdx];
      const buckets = new Map<string, RowData[]>();
      for (const r of items) {
        const val = String(r.customFieldValues[fieldId] || "Other");
        if (!buckets.has(val)) buckets.set(val, []);
        buckets.get(val)!.push(r);
      }
      const groups: ContestantGroup[] = [];
      for (const [rawLabel, members] of buckets) {
        const sorted = [...members].sort((a, b) => b.avgFinal - a.avgFinal || b.allJudgesRawTotal - a.allJudgesRawTotal);
        const children = buildLevel(sorted, fieldIdx + 1, depth + 1);
        groups.push({ label: resolveValue(rawLabel), depth, rows: sorted, children });
      }
      return groups;
    }

    return buildLevel(rows, 0, 0);
  }, [isCategoryLevel, hierarchyFieldIds, rows, resolveValue]);

  const toggleGroupCollapse = useCallback((path: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const toggleRowExpand = useCallback((regId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(regId)) next.delete(regId);
      else next.add(regId);
      return next;
    });
  }, []);

  if (levelsLoading) return <div className="py-8 text-center text-muted-foreground text-sm">Loading levels…</div>;
  if (!levels?.length) return <div className="py-8 text-center text-muted-foreground text-sm">No levels configured yet.</div>;

  const colCount = 4 + judgeUserIds.length + 4; // #, name, sub-event, duration, judges..., total, penalty, final, rank

  // Render a flat table for non-category levels
  function renderFlatTable(tableRows: RowData[], globalOffset = 0) {
    const elements: React.ReactNode[] = [];
    tableRows.forEach((r, i) => {
      const rank = globalOffset + i;
      const advances = !isFinalRound && advancementCount != null && rank < advancementCount;
      const standby = !isFinalRound && advancementCount != null && (rank === advancementCount || rank === advancementCount + 1);
      const isExpanded = expandedRows.has(r.regId);
      const rowBg = showStatusStyling && advances ? "bg-emerald-50 dark:bg-emerald-950/20"
        : showStatusStyling && standby ? "bg-amber-50 dark:bg-amber-950/10"
        : showStatusStyling && isFinalRound && rank < 3 ? "bg-amber-50/50 dark:bg-amber-950/10"
        : "";
      elements.push(
        <TableRow
          key={r.regId}
          className={`${rowBg} cursor-pointer`}
          onClick={() => toggleRowExpand(r.regId)}
        >
          <TableCell className="font-mono text-muted-foreground text-xs">
            <div className="flex items-center gap-1">
              <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              {rank + 1}
            </div>
          </TableCell>
          <TableCell className="font-medium text-sm">
            <Link to={`/profile/${r.userId}`} className="hover:text-secondary hover:underline transition-colors" onClick={(e) => e.stopPropagation()}>
              {r.name}
            </Link>
          </TableCell>
          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
            {subEventMap.get(r.subEventId || "") || "—"}
          </TableCell>
          <TableCell className="text-center font-mono text-xs text-muted-foreground whitespace-nowrap">
            {r.durationSeconds != null
              ? `${Math.floor(r.durationSeconds / 60)}:${String(Math.round(r.durationSeconds % 60)).padStart(2, "0")}`
              : "—"}
          </TableCell>
          {judgeUserIds.map((jId) => {
            const js = r.judgeScores[jId];
            return (
              <TableCell key={jId} className="text-center font-mono text-xs">
                {js ? (
                  <span className={js.certified ? "text-foreground" : "text-muted-foreground"}>
                    {js.rawTotal.toFixed(2)}
                    {!js.certified && <span className="text-[10px] ml-0.5">*</span>}
                  </span>
                ) : "—"}
              </TableCell>
            );
          })}
          <TableCell className="text-center font-mono font-bold text-xs">{r.allJudgesRawTotal.toFixed(2)}</TableCell>
          <TableCell className="text-center font-mono text-xs">
            {r.timePenalty > 0 ? (
              <span className="text-destructive">-{r.timePenalty.toFixed(2)}</span>
            ) : (
              <span className="text-muted-foreground">0</span>
            )}
          </TableCell>
          <TableCell className="text-center font-mono font-bold">{r.avgFinal.toFixed(2)}</TableCell>
          <TableCell className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Badge variant={rank === 0 ? "default" : "outline"} className="text-xs font-mono">{rank + 1}</Badge>
              {showStatusStyling && getRankBadge(rank, isFinalRound, advancementCount)}
            </div>
          </TableCell>
        </TableRow>
      );
      if (isExpanded && formConfig) {
        elements.push(
          <TableRow key={`${r.regId}-details`} className="bg-muted/30">
            <TableCell colSpan={colCount} className="py-3 px-6">
              <ContestantInfoCard
                formConfig={data?.formConfig}
                customFieldValues={r.customFieldValues}
                valueResolver={valueResolver}
              />
            </TableCell>
          </TableRow>
        );
      }
    });
    return elements;
  }

  // Render grouped rows with collapsible category headers
  function renderGroupedRows(groups: ContestantGroup[], parentPath = ""): React.ReactNode[] {
    const elements: React.ReactNode[] = [];
    for (const group of groups) {
      const path = parentPath ? `${parentPath}/${group.label}` : group.label;
      const isCollapsed = collapsedGroups.has(path);
      const depthColors = [
        "bg-primary/10 text-primary",
        "bg-secondary/10 text-secondary-foreground",
        "bg-muted text-muted-foreground",
      ];
      const colorClass = depthColors[group.depth] || depthColors[2];
      const paddingLeft = group.depth * 16 + 12;

      elements.push(
        <TableRow
          key={`group-${path}`}
          className={`cursor-pointer hover:bg-muted/50 ${colorClass}`}
          onClick={() => toggleGroupCollapse(path)}
        >
          <TableCell colSpan={colCount} className="py-2">
            <div className="flex items-center gap-2" style={{ paddingLeft }}>
              <ChevronRight
                className={`h-4 w-4 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
              />
              <span className="font-semibold text-sm">{group.label}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                {group.rows.length}
              </Badge>
            </div>
          </TableCell>
        </TableRow>
      );

      if (!isCollapsed) {
        if (group.children.length > 0) {
          elements.push(...renderGroupedRows(group.children, path));
        } else {
          // Leaf level: render contestant rows ranked within this group
          elements.push(...renderFlatTable(group.rows));
        }
      }
    }
    return elements;
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Leaderboard</h2>
          {isFinalRound && <Badge className="bg-amber-500 text-white text-xs">Final Round</Badge>}
          {isCategoryLevel && <Badge variant="outline" className="text-[10px]">Category</Badge>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {showStatusStyling ? <Eye className="h-3.5 w-3.5 text-muted-foreground" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
            <Switch checked={showStatusStyling} onCheckedChange={setShowStatusStyling} id="lb-status-toggle" />
            <Label htmlFor="lb-status-toggle" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">Status</Label>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={rows.length === 0} className="print:hidden">
                <Sheet className="h-4 w-4 mr-1.5" />
                Google Sheets
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-3">
              <p className="text-sm font-medium text-foreground mb-2">Include profile columns</p>
              {exportableFields.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-1.5 mb-3">
                  {exportableFields.map((f) => (
                    <div key={f.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`exp-${f.id}`}
                        checked={exportFieldIds.has(f.id)}
                        onCheckedChange={() => toggleExportField(f.id)}
                      />
                      <label htmlFor={`exp-${f.id}`} className="text-xs cursor-pointer truncate">{f.label}</label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mb-3">No registration fields available.</p>
              )}
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  const sheetRows: SheetRow[] = rows.map((r, idx) => {
                    const row: SheetRow = {
                      "#": idx + 1,
                      Contestant: r.name,
                      "Sub-Event": subEventMap.get(r.subEventId || "") || "",
                      Duration: r.durationSeconds != null ? `${Math.floor(r.durationSeconds / 60)}:${String(Math.floor(r.durationSeconds % 60)).padStart(2, "0")}` : "",
                    };
                    // Add selected profile/registration fields
                    for (const f of exportableFields) {
                      if (exportFieldIds.has(f.id)) {
                        const raw = r.customFieldValues[f.id];
                        row[f.label] = raw != null ? (valueResolver.get(String(raw)) || String(raw)) : "";
                      }
                    }
                    for (const jId of judgeUserIds) {
                      const js = r.judgeScores[jId];
                      row[profileMap.get(jId) || "Judge"] = js ? Number(js.rawTotal.toFixed(2)) : "";
                    }
                    row["Total"] = Number(r.allJudgesRawTotal.toFixed(2));
                    row["Penalty"] = Number(r.timePenalty.toFixed(2));
                    row["Final"] = Number(r.avgFinal.toFixed(2));
                    row["Rank"] = idx + 1;
                    return row;
                  });
                  exportGoogleSheets(sheetRows, `Leaderboard_${selectedLevel?.name || "scores"}`);
                }}
              >
                <Sheet className="h-4 w-4 mr-1.5" />
                Export
              </Button>
            </PopoverContent>
          </Popover>
          <Select value={levelId || ""} onValueChange={(val) => setSelectedLevelId(val)}>
            <SelectTrigger className="w-[200px] h-8 text-sm">
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              {levels.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {rows.length} Contestant{rows.length !== 1 ? "s" : ""} • {judgeUserIds.length} Judge{judgeUserIds.length !== 1 ? "s" : ""}
          </CardTitle>
          <CardDescription>
            {isCategoryLevel
              ? "Grouped by category hierarchy. Click a group to expand/collapse."
              : "Overall ranking across all sub-events in this level."}
            {isFinalRound && (
              <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">
                Final round — Champion placements shown.
              </span>
            )}
            {!isFinalRound && advancementCount != null && (
              <span className="ml-1 font-medium text-emerald-600 dark:text-emerald-400">
                Top {advancementCount} advance. +2 standbys.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading scores…</div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No scores submitted yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Contestant</TableHead>
                    <TableHead className="text-xs">Sub-Event</TableHead>
                    <TableHead className="text-center text-xs">Duration</TableHead>
                    {judgeUserIds.map((jId) => (
                      <TableHead key={jId} className="text-center text-xs whitespace-nowrap">
                        {profileMap.get(jId) || "Judge"}
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-bold text-xs">Total</TableHead>
                    <TableHead className="text-center font-bold text-xs">Penalty</TableHead>
                    <TableHead className="text-center font-bold text-xs">Final</TableHead>
                    <TableHead className="text-center">Rank</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isCategoryLevel && groupedTree
                    ? renderGroupedRows(groupedTree)
                    : renderFlatTable(rows)}
                </TableBody>
              </Table>
              <p className="text-[10px] text-muted-foreground mt-2">* Uncertified score</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
