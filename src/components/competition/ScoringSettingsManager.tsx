import { useState, useEffect, useCallback, useMemo } from "react";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useAllSubEvents, useLevels, useCompetition, useSubEvents, useUpdateActiveScoringConfig } from "@/hooks/useCompetitions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Clock, MessageSquare, Settings, Calculator, FileDown, CreditCard, Zap, X, User, Video, GripVertical, Plus, Trash2, LayoutGrid } from "lucide-react";
import { SCORING_METHODS } from "@/lib/scoring-methods";
import { ScoreSheetDownloads } from "./ScoreSheetDownloads";
import { ScoreCardExportSection } from "./ScoreCardExportSection";
import { migrateFormConfig, getScorecardFields, ScorecardCard } from "@/lib/form-builder-types";

const categories = {
  active: { label: "Active Scoring", icon: Zap, description: "Set which level and sub-event judges should be scoring." },
  method: { label: "Scoring Method", icon: Calculator, description: "Choose how judge scores are aggregated into a contestant's final ranking." },
  sections: { label: "Judge Card Sections", icon: Settings, description: "Control which sections appear on judge scoring cards for each sub-event." },
  layout: { label: "Scorecard Layout", icon: LayoutGrid, description: "Configure how contestant details are grouped into sub-cards on the judge scorecard." },
  sheets: { label: "Score Sheets", icon: FileDown, description: "Download printable score sheets for offline judging." },
  export: { label: "Score Cards", icon: CreditCard, description: "Export PDF score cards for contestants and records." },
} as const;

type Category = keyof typeof categories;

interface ScoringSettingsManagerProps {
  competitionId: string;
}

export function ScoringSettingsManager({ competitionId }: ScoringSettingsManagerProps) {
  const { data: levels } = useLevels(competitionId);
  const { data: competition } = useCompetition(competitionId);
  const qc = useQueryClient();

  const [activeCategory, setActiveCategory] = useState<Category>("active");
  const [scoringMethod, setScoringMethod] = useState<string>("olympic");
  const [subEventSettings, setSubEventSettings] = useState<Record<string, { timer_visible: boolean; comments_visible: boolean; profile_details_visible: boolean; video_visible: boolean }>>({});

  // Active scoring state
  const updateActive = useUpdateActiveScoringConfig();
  const [selectedLevelId, setSelectedLevelId] = useState(competition?.active_scoring_level_id || "");
  const [selectedSubEventId, setSelectedSubEventId] = useState(competition?.active_scoring_sub_event_id || "");
  const { data: activeLevelSubEvents } = useSubEvents(selectedLevelId || undefined);

  useEffect(() => {
    setSelectedLevelId(competition?.active_scoring_level_id || "");
    setSelectedSubEventId(competition?.active_scoring_sub_event_id || "");
  }, [competition?.active_scoring_level_id, competition?.active_scoring_sub_event_id]);

  useEffect(() => {
    if (competition?.scoring_method) {
      setScoringMethod(competition.scoring_method);
    }
  }, [competition?.scoring_method]);

  const { data: allSubEvents } = useAllSubEvents(competitionId);

  useEffect(() => {
    if (allSubEvents) {
      const settings: Record<string, { timer_visible: boolean; comments_visible: boolean; profile_details_visible: boolean; video_visible: boolean }> = {};
      allSubEvents.forEach(se => {
        settings[se.id] = {
          timer_visible: se.timer_visible ?? true,
          comments_visible: se.comments_visible ?? true,
          profile_details_visible: (se as any).profile_details_visible ?? true,
          video_visible: (se as any).video_visible ?? true,
        };
      });
      setSubEventSettings(settings);
    }
  }, [allSubEvents]);

  const updateScoringMethod = async (value: string) => {
    const prev = scoringMethod;
    setScoringMethod(value);
    try {
      const { error } = await supabase
        .from("competitions")
        .update({ scoring_method: value })
        .eq("id", competitionId);
      if (error) {
        setScoringMethod(prev);
        toast({ title: "Failed to update scoring method", description: error.message, variant: "destructive" });
        return;
      }
      qc.invalidateQueries({ queryKey: ["competition", competitionId] });
      toast({ title: "Scoring method updated" });
    } catch {
      setScoringMethod(prev);
    }
  };

  const updateSubEventSetting = async (subEventId: string, field: 'timer_visible' | 'comments_visible' | 'profile_details_visible' | 'video_visible', value: boolean) => {
    try {
      setSubEventSettings(prev => ({
        ...prev,
        [subEventId]: { ...prev[subEventId], [field]: value },
      }));

      const updateData: Record<string, boolean> = {};
      updateData[field] = value;
      
      const { error } = await supabase
        .from('sub_events')
        .update(updateData)
        .eq('id', subEventId);

      if (error) {
        toast({ title: "Failed to update setting", description: error.message || "An error occurred", variant: "destructive" });
        setSubEventSettings(prev => ({
          ...prev,
          [subEventId]: { ...prev[subEventId], [field]: !value },
        }));
        throw error;
      }

      qc.invalidateQueries({ queryKey: ['sub_events'] });
      qc.invalidateQueries({ queryKey: ['all_sub_events'] });
      toast({ title: "Setting updated" });
    } catch (error: any) {
      console.error('Error updating sub-event setting:', error);
    }
  };

  const handleActivateScoring = () => {
    if (!selectedLevelId || !selectedSubEventId) return;
    updateActive.mutate({ competitionId, levelId: selectedLevelId, subEventId: selectedSubEventId });
  };

  const handleDeactivateScoring = () => {
    updateActive.mutate({ competitionId, levelId: null, subEventId: null });
  };

  const catKeys = Object.keys(categories) as Category[];
  const swipeNav = useCallback((dir: 1 | -1) => {
    setActiveCategory(prev => {
      const i = catKeys.indexOf(prev);
      const next = i + dir;
      return next >= 0 && next < catKeys.length ? catKeys[next] : prev;
    });
  }, [catKeys]);
  const swipeHandlers = useSwipeGesture({ onSwipeLeft: () => swipeNav(1), onSwipeRight: () => swipeNav(-1) });

  if (!allSubEvents || !levels) {
    return <div className="text-muted-foreground font-mono text-sm animate-pulse">Loading…</div>;
  }

  const selectedMeta = SCORING_METHODS.find(m => m.value === scoringMethod) || SCORING_METHODS[0];

  const subEventsByLevel = levels.map(level => ({
    level,
    subEvents: allSubEvents.filter(se => se.level_id === level.id),
  })).filter(group => group.subEvents.length > 0);

  const isActive = competition?.active_scoring_level_id && competition?.active_scoring_sub_event_id;
  const activeLevelName = levels?.find(l => l.id === competition?.active_scoring_level_id)?.name;
  const activeSubEventName = activeLevelSubEvents?.find(se => se.id === competition?.active_scoring_sub_event_id)?.name;

  return (
    <div className="space-y-4">
      {/* Category pill bar */}
      <div className="flex overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        <div className="flex gap-2 min-w-max">
          {catKeys.map((key) => {
            const cat = categories[key];
            const Icon = cat.icon;
            const isActiveTab = activeCategory === key;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 min-h-[44px] rounded-full text-sm font-medium border transition-all ${
                  isActiveTab
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active category card */}
      <Card className="rounded-xl border-border/50 bg-card/80" {...swipeHandlers}>
        <CardContent className="p-3 sm:p-5 space-y-4">
          <p className="text-sm text-muted-foreground">{categories[activeCategory].description}</p>

          {/* Active Scoring Control */}
          {activeCategory === "active" && (
            <div className="space-y-4">
              {isActive && (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <Zap className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    <strong>Scoring Active:</strong> {activeLevelName} → {activeSubEventName}
                    <br />
                    <span className="text-xs">Judges will automatically load this level and sub-event</span>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Level</label>
                  <Select value={selectedLevelId} onValueChange={setSelectedLevelId} disabled={!!isActive}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {levels?.map(level => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Sub-Event</label>
                  <Select value={selectedSubEventId} onValueChange={setSelectedSubEventId} disabled={!selectedLevelId || !!isActive}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub-event" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeLevelSubEvents?.map(subEvent => (
                        <SelectItem key={subEvent.id} value={subEvent.id}>
                          {subEvent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleActivateScoring}
                  disabled={!selectedLevelId || !selectedSubEventId || !!isActive || updateActive.isPending}
                  className="flex-1"
                >
                  {updateActive.isPending ? "Activating..." : "Activate Scoring"}
                </Button>
                {isActive && (
                  <Button
                    onClick={handleDeactivateScoring}
                    disabled={updateActive.isPending}
                    variant="destructive"
                    size="icon"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Scoring Method */}
          {activeCategory === "method" && (
            <div className="space-y-4">
              <div className="max-w-sm">
                <Select value={scoringMethod} onValueChange={updateScoringMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCORING_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border border-border/40 bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-mono">
                    {selectedMeta.value}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{selectedMeta.label}</span>
                </div>
                <p className="text-sm text-muted-foreground">{selectedMeta.description}</p>
                <p className="text-xs font-mono text-muted-foreground/80 bg-muted/50 rounded px-2 py-1 inline-block">
                  {selectedMeta.formula}
                </p>
                {scoringMethod === "weighted" && (
                  <p className="text-xs text-amber-500 mt-1">
                    ⚠ Configure criterion weights in the Rubric tab. Ensure weights total 100%.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Judge Card Sections */}
          {activeCategory === "sections" && (
            <div className="space-y-4">
              {subEventsByLevel.map(({ level, subEvents }) => (
                <div key={level.id} className="space-y-3">
                  <h3 className="text-sm font-medium text-foreground">{level.name}</h3>
                  {subEvents.map((subEvent) => (
                    <div key={subEvent.id} className="border border-border/30 rounded-lg p-4 space-y-3">
                      <div>
                        <h4 className="font-medium text-foreground">{subEvent.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {subEvent.status}
                          </Badge>
                          {subEvent.location && (
                            <span className="text-xs text-muted-foreground">{subEvent.location}</span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4 text-muted-foreground" />
                            <Label htmlFor={`video-${subEvent.id}`} className="text-sm font-medium">
                              Video
                            </Label>
                          </div>
                          <Switch
                            id={`video-${subEvent.id}`}
                            checked={subEventSettings[subEvent.id]?.video_visible ?? true}
                            onCheckedChange={(checked) =>
                              updateSubEventSetting(subEvent.id, 'video_visible', checked)
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Label htmlFor={`timer-${subEvent.id}`} className="text-sm font-medium">
                              Timer
                            </Label>
                          </div>
                          <Switch
                            id={`timer-${subEvent.id}`}
                            checked={subEventSettings[subEvent.id]?.timer_visible ?? true}
                            onCheckedChange={(checked) =>
                              updateSubEventSetting(subEvent.id, 'timer_visible', checked)
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <Label htmlFor={`profile-${subEvent.id}`} className="text-sm font-medium">
                              Profile Details
                            </Label>
                          </div>
                          <Switch
                            id={`profile-${subEvent.id}`}
                            checked={subEventSettings[subEvent.id]?.profile_details_visible ?? true}
                            onCheckedChange={(checked) =>
                              updateSubEventSetting(subEvent.id, 'profile_details_visible', checked)
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <Label htmlFor={`comments-${subEvent.id}`} className="text-sm font-medium">
                              Comments
                            </Label>
                          </div>
                          <Switch
                            id={`comments-${subEvent.id}`}
                            checked={subEventSettings[subEvent.id]?.comments_visible ?? true}
                            onCheckedChange={(checked) =>
                              updateSubEventSetting(subEvent.id, 'comments_visible', checked)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {subEventsByLevel.length === 0 && (
                <div className="py-6 text-center text-muted-foreground">
                  <Settings className="h-8 w-8 mx-auto mb-3 opacity-40" />
                  <p>No sub-events found. Create levels and sub-events first.</p>
                </div>
              )}
            </div>
          )}

          {/* Scorecard Layout */}
          {activeCategory === "layout" && (
            <ScorecardLayoutEditor competitionId={competitionId} />
          )}

          {/* Score Sheets */}
          {activeCategory === "sheets" && (
            <ScoreSheetDownloads
              competitionId={competitionId}
              levels={levels || []}
              subEvents={(allSubEvents || []).map(se => ({ id: se.id, name: se.name, level_id: se.level_id, status: se.status }))}
            />
          )}

          {/* Score Card Export */}
          {activeCategory === "export" && (
            <ScoreCardExportSection
              competitionId={competitionId}
              competitionName={competition?.name || ""}
              levels={levels || []}
              subEvents={(allSubEvents || []).map(se => ({ id: se.id, name: se.name, level_id: se.level_id, status: se.status }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
