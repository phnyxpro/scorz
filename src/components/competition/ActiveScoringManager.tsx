import { useState, useEffect } from "react";
import { useLevels, useSubEvents, useUpdateActiveScoringConfig } from "@/hooks/useCompetitions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, X } from "lucide-react";

interface ActiveScoringManagerProps {
  competitionId: string;
  activeLevelId: string | null | undefined;
  activeSubEventId: string | null | undefined;
}

export function ActiveScoringManager({
  competitionId,
  activeLevelId,
  activeSubEventId,
}: ActiveScoringManagerProps) {
  const { data: levels } = useLevels(competitionId);
  const updateActive = useUpdateActiveScoringConfig();

  const [selectedLevelId, setSelectedLevelId] = useState(activeLevelId || "");
  const [selectedSubEventId, setSelectedSubEventId] = useState(activeSubEventId || "");
  const { data: subEvents } = useSubEvents(selectedLevelId || undefined);

  const selectedLevel = levels?.find(l => l.id === selectedLevelId);
  const isCategoryType = selectedLevel?.structure_type === "categories";

  useEffect(() => {
    setSelectedLevelId(activeLevelId || "");
    setSelectedSubEventId(activeSubEventId || "");
  }, [activeLevelId, activeSubEventId]);

  const handleActivateScoring = () => {
    if (!selectedLevelId) return;
    // For category-type levels, sub-event is not required
    if (!isCategoryType && !selectedSubEventId) return;
    updateActive.mutate({
      competitionId,
      levelId: selectedLevelId,
      subEventId: isCategoryType ? null : selectedSubEventId,
    });
  };

  const handleDeactivateScoring = () => {
    updateActive.mutate({
      competitionId,
      levelId: null,
      subEventId: null,
    });
  };

  const isActive = !!activeLevelId;
  const activeLevelName = levels?.find(l => l.id === activeLevelId)?.name;
  const activeSubEventName = subEvents?.find(se => se.id === activeSubEventId)?.name;

  const canActivate = selectedLevelId && (isCategoryType || selectedSubEventId);

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Active Scoring Control
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Set which level {isCategoryType ? "" : "and sub-event "}judges should be scoring
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isActive && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <Zap className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                <strong>Scoring Active:</strong> {activeLevelName}
                {activeSubEventName && <> → {activeSubEventName}</>}
                <br />
                <span className="text-xs">Judges will automatically load this level{activeSubEventName ? " and sub-event" : ""}</span>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Level</label>
              <Select value={selectedLevelId} onValueChange={(v) => { setSelectedLevelId(v); setSelectedSubEventId(""); }} disabled={isActive}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {levels?.map(level => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.name}
                      {level.structure_type === "categories" && (
                        <span className="text-muted-foreground ml-1 text-xs">(categories)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isCategoryType && (
              <div>
                <label className="text-sm font-medium mb-2 block">Sub-Event</label>
                <Select value={selectedSubEventId} onValueChange={setSelectedSubEventId} disabled={!selectedLevelId || isActive}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-event" />
                  </SelectTrigger>
                  <SelectContent>
                    {subEvents?.map(subEvent => (
                      <SelectItem key={subEvent.id} value={subEvent.id}>
                        {subEvent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isCategoryType && selectedLevelId && (
              <p className="text-xs text-muted-foreground">
                This level uses categories — scoring will activate for the entire level.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleActivateScoring}
              disabled={!canActivate || isActive || updateActive.isPending}
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
        </CardContent>
      </Card>
    </div>
  );
}
