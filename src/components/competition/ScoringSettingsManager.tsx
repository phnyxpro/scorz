import { useState, useEffect } from "react";
import { useAllSubEvents, useLevels, useCompetition } from "@/hooks/useCompetitions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Clock, MessageSquare, Settings, Calculator } from "lucide-react";
import { SCORING_METHODS } from "@/lib/scoring-methods";

interface ScoringSettingsManagerProps {
  competitionId: string;
}

export function ScoringSettingsManager({ competitionId }: ScoringSettingsManagerProps) {
  const { data: levels } = useLevels(competitionId);
  const { data: competition } = useCompetition(competitionId);
  const qc = useQueryClient();

  const [scoringMethod, setScoringMethod] = useState<string>("olympic");
  const [subEventSettings, setSubEventSettings] = useState<Record<string, { timer_visible: boolean; comments_visible: boolean }>>({});

  // Sync scoring method from competition data
  useEffect(() => {
    if (competition?.scoring_method) {
      setScoringMethod(competition.scoring_method);
    }
  }, [competition?.scoring_method]);

  // Load all sub-events for the competition
  const { data: allSubEvents } = useAllSubEvents(competitionId);

  useEffect(() => {
    if (allSubEvents) {
      const settings: Record<string, { timer_visible: boolean; comments_visible: boolean }> = {};
      allSubEvents.forEach(se => {
        settings[se.id] = {
          timer_visible: se.timer_visible ?? true,
          comments_visible: se.comments_visible ?? true,
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

  const updateSubEventSetting = async (subEventId: string, field: 'timer_visible' | 'comments_visible', value: boolean) => {
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
        const errorMsg = error.message || '';
        if (errorMsg.includes('schema cache') || errorMsg.includes('timer_visible') || errorMsg.includes('comments_visible')) {
          toast({ title: "Database schema needs update", description: "Please run the migration SQL in your Supabase dashboard. Check MIGRATION_SQL.sql in the project root.", variant: "destructive" });
        } else {
          toast({ title: "Failed to update setting", description: error.message || "An error occurred", variant: "destructive" });
        }
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

  if (!allSubEvents || !levels) {
    return <div className="text-muted-foreground font-mono text-sm animate-pulse">Loading…</div>;
  }

  const selectedMeta = SCORING_METHODS.find(m => m.value === scoringMethod) || SCORING_METHODS[0];

  // Group sub-events by level
  const subEventsByLevel = levels.map(level => ({
    level,
    subEvents: allSubEvents.filter(se => se.level_id === level.id),
  })).filter(group => group.subEvents.length > 0);

  return (
    <div className="space-y-6">
      {/* Scoring Method Selector */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Scoring Method
          </CardTitle>
          <CardDescription>
            Choose how judge scores are aggregated into a contestant's final ranking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {/* Per-sub-event visibility toggles */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-5 w-5 text-secondary" />
            Judge Card Sections
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Control which sections appear on judge scoring cards for each sub-event
          </p>
        </CardHeader>
      </Card>

      {subEventsByLevel.map(({ level, subEvents }) => (
        <Card key={level.id} className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">{level.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subEvents.map((subEvent) => (
              <div key={subEvent.id} className="border border-border/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor={`timer-${subEvent.id}`} className="text-sm font-medium">
                        Timer Section
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
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor={`comments-${subEvent.id}`} className="text-sm font-medium">
                        Comments Section
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
          </CardContent>
        </Card>
      ))}

      {subEventsByLevel.length === 0 && (
        <Card className="border-border/50 bg-card/80">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Settings className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p>No sub-events found. Create levels and sub-events first.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}