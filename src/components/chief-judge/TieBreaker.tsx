import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Scale } from "lucide-react";
import type { RubricCriterion } from "@/hooks/useCompetitions";
import type { JudgeScore } from "@/hooks/useJudgeScores";
import type { ChiefJudgeCertification } from "@/hooks/useChiefJudge";

interface TieBreakerProps {
  ties: { regId: string; avg: number; scores: JudgeScore[] }[][];
  contestantName: (regId: string) => string;
  rubric: RubricCriterion[];
  isCertified: boolean;
  certification: ChiefJudgeCertification | null | undefined;
  onSaveTieBreak: (criterionId: string, notes: string) => Promise<void>;
}

export function TieBreaker({ ties, contestantName, rubric, isCertified, certification, onSaveTieBreak }: TieBreakerProps) {
  const [selectedCriterion, setSelectedCriterion] = useState(certification?.tie_break_criterion_id || "");
  const [notes, setNotes] = useState(certification?.tie_break_notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedCriterion) return;
    setSaving(true);
    await onSaveTieBreak(selectedCriterion, notes);
    setSaving(false);
  };

  if (ties.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="py-8 text-center">
          <CheckCircle className="h-8 w-8 text-secondary mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No ties detected. All scores are unique.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Tie Breaking</CardTitle>
        </div>
        <CardDescription>
          {ties.length} tie{ties.length > 1 ? "s" : ""} detected. Select a priority criterion to resolve.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show tied groups */}
        {ties.map((group, gi) => (
          <div key={gi} className="border border-border/50 rounded-md p-3 bg-muted/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Tie at {group[0].avg.toFixed(2)} points
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.map(entry => (
                <Badge key={entry.regId} variant="outline" className="text-sm">
                  {contestantName(entry.regId)}
                </Badge>
              ))}
            </div>

            {/* Per-criterion breakdown for tied contestants */}
            {selectedCriterion && (
              <div className="mt-3 pt-2 border-t border-border/30">
                <p className="text-xs text-muted-foreground mb-1">
                  Priority criterion scores ({rubric.find(r => r.id === selectedCriterion)?.name}):
                </p>
                <div className="space-y-1">
                  {group.map(entry => {
                    // Average the selected criterion across all judges
                    const criterionScores = entry.scores
                      .filter(s => s.is_certified && s.criterion_scores[selectedCriterion])
                      .map(s => s.criterion_scores[selectedCriterion]);
                    const criterionAvg = criterionScores.length
                      ? (criterionScores.reduce((a, b) => a + b, 0) / criterionScores.length)
                      : 0;
                    return (
                      <div key={entry.regId} className="flex justify-between text-xs">
                        <span className="text-foreground">{contestantName(entry.regId)}</span>
                        <span className="font-mono font-bold text-primary">{criterionAvg.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Tie-break controls */}
        {!isCertified && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-muted-foreground">Priority Criterion for Tie Resolution</label>
              <Select value={selectedCriterion} onValueChange={setSelectedCriterion}>
                <SelectTrigger><SelectValue placeholder="Select criterion…" /></SelectTrigger>
                <SelectContent>
                  {rubric.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Tie-Break Notes</label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Justification for tie resolution…"
                rows={2}
              />
            </div>

            <Button onClick={handleSave} disabled={saving || !selectedCriterion} size="sm">
              {saving ? "Saving…" : "Save Tie-Break Decision"}
            </Button>
          </div>
        )}

        {isCertified && certification?.tie_break_criterion_id && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Resolved using: <span className="font-medium text-foreground">
                {rubric.find(r => r.id === certification.tie_break_criterion_id)?.name}
              </span>
            </p>
            {certification.tie_break_notes && (
              <p className="text-xs text-muted-foreground mt-1 italic">{certification.tie_break_notes}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
