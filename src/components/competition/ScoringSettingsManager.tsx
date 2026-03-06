import { useState, useEffect } from "react";
import { useAllSubEvents, useLevels } from "@/hooks/useCompetitions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Clock, MessageSquare, Settings } from "lucide-react";

interface ScoringSettingsManagerProps {
  competitionId: string;
}

export function ScoringSettingsManager({ competitionId }: ScoringSettingsManagerProps) {
  const { data: levels } = useLevels(competitionId);
  const qc = useQueryClient();

  const [subEventSettings, setSubEventSettings] = useState<Record<string, { timer_visible: boolean; comments_visible: boolean }>>({});

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

  const updateSubEventSetting = async (subEventId: string, field: 'timer_visible' | 'comments_visible', value: boolean) => {
    try {
      // Update the state optimistically first
      setSubEventSettings(prev => ({
        ...prev,
        [subEventId]: {
          ...prev[subEventId],
          [field]: value,
        },
      }));

      // Build the update object with explicit type
      const updateData: Record<string, boolean> = {};
      updateData[field] = value;
      
      const { error } = await supabase
        .from('sub_events')
        .update(updateData as any)
        .eq('id', subEventId);

      if (error) {
        // Check if it's a schema cache issue
        const errorMsg = error.message || '';
        if (errorMsg.includes('schema cache') || errorMsg.includes('timer_visible') || errorMsg.includes('comments_visible')) {
          toast({ 
            title: "Database schema needs update", 
            description: "Please run the migration SQL in your Supabase dashboard. Check MIGRATION_SQL.sql in the project root.", 
            variant: "destructive" 
          });
        } else {
          toast({ 
            title: "Failed to update setting", 
            description: error.message || "An error occurred", 
            variant: "destructive" 
          });
        }
        
        // Revert on error
        setSubEventSettings(prev => ({
          ...prev,
          [subEventId]: {
            ...prev[subEventId],
            [field]: !value,
          },
        }));
        throw error;
      }

      // Invalidate all relevant queries
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

  // Group sub-events by level
  const subEventsByLevel = levels.map(level => ({
    level,
    subEvents: allSubEvents.filter(se => se.level_id === level.id),
  })).filter(group => group.subEvents.length > 0);

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Scoring
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