import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";
import { ScoreCardExporter } from "@/components/shared/ScoreCardExporter";
import { resolveStaffNames } from "@/hooks/useStaffDisplayNames";
import type { ContestantRegistration } from "@/hooks/useRegistrations";

interface ScoreCardExportSectionProps {
  competitionId: string;
  competitionName: string;
  levels: { id: string; name: string }[];
  subEvents: { id: string; name: string; level_id: string; status: string }[];
}

export function ScoreCardExportSection({ competitionId, competitionName, levels, subEvents }: ScoreCardExportSectionProps) {
  const [selectedSubEventId, setSelectedSubEventId] = useState<string>("");

  const selectedSubEvent = subEvents.find(se => se.id === selectedSubEventId);

  const { data: contestants } = useQuery({
    queryKey: ["registrations_for_export", competitionId, selectedSubEventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contestant_registrations")
        .select("*")
        .eq("competition_id", competitionId)
        .eq("sub_event_id", selectedSubEventId)
        .eq("status", "approved")
        .order("sort_order");
      if (error) throw error;
      return data as ContestantRegistration[];
    },
    enabled: !!selectedSubEventId,
  });

  const { data: judges } = useQuery({
    queryKey: ["judges_for_export", selectedSubEventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_event_assignments")
        .select("user_id, is_chief")
        .eq("sub_event_id", selectedSubEventId)
        .eq("role", "judge");
      if (error) throw error;
      const userIds = data.map(a => a.user_id);
      if (userIds.length === 0) return [];
      const nameMap = await resolveStaffNames(userIds);
      return userIds.map(uid => ({ id: uid, name: nameMap[uid] || "Unknown Judge" }));
    },
    enabled: !!selectedSubEventId,
  });

  const { data: judgeScores } = useQuery({
    queryKey: ["judge_scores_for_export", selectedSubEventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("judge_scores")
        .select("*")
        .eq("sub_event_id", selectedSubEventId);
      if (error) throw error;
      return data.map(s => ({
        ...s,
        criterion_scores: (s.criterion_scores as Record<string, number>) || {},
      }));
    },
    enabled: !!selectedSubEventId,
  });

  // Group sub-events by level for the dropdown
  const groupedOptions = levels
    .map(level => ({
      level,
      subs: subEvents.filter(se => se.level_id === level.id),
    }))
    .filter(g => g.subs.length > 0);

  if (subEvents.length === 0) return null;

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          PDF Score Card Export
        </CardTitle>
        <CardDescription>
          Generate printable PDF score cards for judges — blank templates or pre-filled with contestant data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-sm space-y-2">
          <Label>Sub-Event</Label>
          <Select value={selectedSubEventId} onValueChange={setSelectedSubEventId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a sub-event" />
            </SelectTrigger>
            <SelectContent>
              {groupedOptions.map(({ level, subs }) => (
                <div key={level.id}>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{level.name}</div>
                  {subs.map(se => (
                    <SelectItem key={se.id} value={se.id}>{se.name}</SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedSubEventId && contestants && (
          <ScoreCardExporter
            contestants={contestants}
            subEventName={selectedSubEvent?.name || ""}
            competitionName={competitionName}
            judgeScores={judgeScores || []}
            availableJudges={judges || []}
          />
        )}
      </CardContent>
    </Card>
  );
}
