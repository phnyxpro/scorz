import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText, Star } from "lucide-react";
import { CriterionSlider } from "@/components/scoring/CriterionSlider";
import { ScoreCard } from "@/components/shared/ScoreCard";
import type { RubricCriterion, RubricScaleLabels } from "@/hooks/useCompetitions";

const SAMPLE_CONTESTANT = {
  id: "preview", user_id: "preview", competition_id: "preview", sub_event_id: null,
  full_name: "Jane Doe", age_category: "Adult", location: "New York, NY",
  email: "jane@example.com", phone: null, bio: null, status: "approved",
  sort_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  rules_acknowledged: true, rules_acknowledged_at: null, contestant_signature: null,
  contestant_signed_at: null, guardian_name: null, guardian_email: null, guardian_phone: null,
  guardian_signature: null, guardian_signed_at: null, profile_photo_url: null,
  performance_video_url: null, social_handles: null, special_entry_type: null,
};

interface RubricPreviewProps {
  criteria: RubricCriterion[];
  scaleLabels: RubricScaleLabels;
  competitionName: string;
}

export function RubricPreview({ criteria, scaleLabels, competitionName }: RubricPreviewProps) {
  const [previewScores, setPreviewScores] = useState<Record<string, number>>({});

  const activeCriteria = criteria.filter((c) => !c.is_bonus);
  const bonusCriteria = criteria.filter((c) => c.is_bonus);

  const criterionScores: Record<string, number> = {};
  criteria.forEach((c) => { criterionScores[c.id] = previewScores[c.id] ?? 0; });
  const rawTotal = Object.values(criterionScores).reduce((s, v) => s + v, 0);

  const mockJudgeScore = {
    id: "preview", sub_event_id: "preview", judge_id: "preview",
    contestant_registration_id: "preview", criterion_scores: criterionScores,
    raw_total: rawTotal, performance_duration_seconds: 180, time_penalty: 0,
    final_score: rawTotal, signed_at: null, is_certified: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    comments: "Sample comment for preview", judge_signature: null,
  };

  const rubricCriteriaForCard = criteria.map((c) => ({
    id: c.id,
    name: c.name,
    notes: c.notes,
    point_values: c.point_values,
    weight_percent: c.weight_percent,
  }));

  if (!criteria.length) return null;

  return (
    <Tabs defaultValue="judge-preview" className="space-y-4">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="judge-preview" className="text-xs gap-1.5">
          <Eye className="h-3.5 w-3.5" /> Judge Scoring Preview
        </TabsTrigger>
        <TabsTrigger value="scorecard-preview" className="text-xs gap-1.5">
          <FileText className="h-3.5 w-3.5" /> Score Card Preview
        </TabsTrigger>
      </TabsList>

      {/* ── Judge Scoring Preview ── */}
      <TabsContent value="judge-preview">
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> Judge Scoring Preview
            </CardTitle>
            <CardDescription className="text-xs">
              This is what judges see when scoring a contestant. Interact with the sliders to test the experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {activeCriteria.map((c) => (
              <CriterionSlider
                key={c.id} criterion={c}
                value={previewScores[c.id] || 0}
                onChange={(v) => setPreviewScores((p) => ({ ...p, [c.id]: v }))}
                scaleLabels={scaleLabels}
              />
            ))}
            {bonusCriteria.length > 0 && (
              <>
                <div className="border-t border-border/50 pt-2 mt-2">
                  <p className="text-xs font-medium text-amber-600 flex items-center gap-1 mb-1">
                    <Star className="h-3.5 w-3.5" /> Bonus Criteria
                  </p>
                </div>
                {bonusCriteria.map((c) => (
                  <CriterionSlider
                    key={c.id} criterion={c}
                    value={previewScores[c.id] || 0}
                    onChange={(v) => setPreviewScores((p) => ({ ...p, [c.id]: v }))}
                    scaleLabels={scaleLabels}
                  />
                ))}
              </>
            )}
            <div className="border-t border-border/50 pt-3 mt-3 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Preview Total</span>
              <span className="text-lg font-bold font-mono text-primary">{rawTotal.toFixed(1)}</span>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Score Card Preview ── */}
      <TabsContent value="scorecard-preview">
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Score Card Preview
            </CardTitle>
            <CardDescription className="text-xs">
              Preview of the printed score card. Scores from the Judge Scoring Preview tab are reflected here.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ScoreCard
              contestant={SAMPLE_CONTESTANT as any}
              subEventName="Sample Sub-Event"
              competitionName={competitionName}
              judgeScore={mockJudgeScore as any}
              judgeName="Judge Preview"
              rubricCriteria={rubricCriteriaForCard}
            />
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 mt-4">
          <CardHeader>
            <CardTitle className="text-sm">Blank Score Card</CardTitle>
            <CardDescription className="text-xs">What a blank printed card looks like.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ScoreCard
              contestant={SAMPLE_CONTESTANT as any}
              subEventName="Sample Sub-Event"
              competitionName={competitionName}
              isBlank
              rubricCriteria={rubricCriteriaForCard}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
