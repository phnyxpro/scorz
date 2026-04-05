import { useState, useEffect } from "react";
import { useLevels, useUpdateActiveScoringConfig } from "@/hooks/useCompetitions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, X } from "lucide-react";

interface ActiveScoringManagerProps {
  competitionId: string;
  activeLevelId: string | null | undefined;
  activeSubEventId?: string | null | undefined;
}

export function ActiveScoringManager({
  competitionId,
  activeLevelId,
}: ActiveScoringManagerProps) {
  const { data: levels } = useLevels(competitionId);
  const updateActive = useUpdateActiveScoringConfig();

  const [selectedLevelId, setSelectedLevelId] = useState(activeLevelId || "");

  useEffect(() => {
    setSelectedLevelId(activeLevelId || "");
  }, [activeLevelId]);

  const handleActivateScoring = () => {
    if (!selectedLevelId) return;
    updateActive.mutate({
      competitionId,
      levelId: selectedLevelId,
      subEventId: null,
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

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Active Scoring Control
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Set which level judges should be scoring — all sub-events within the level are activated automatically
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isActive && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <Zap className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                <strong>Scoring Active:</strong> {activeLevelName}
                <br />
                <span className="text-xs">Judges will automatically load this level and all its sub-events</span>
              </AlertDescription>
            </Alert>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Level</label>
            <Select value={selectedLevelId} onValueChange={setSelectedLevelId} disabled={isActive}>
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

          <div className="flex gap-2">
            <Button
              onClick={handleActivateScoring}
              disabled={!selectedLevelId || isActive || updateActive.isPending}
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
