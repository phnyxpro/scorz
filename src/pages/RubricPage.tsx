import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCompetition, useRubricCriteria, type RubricScaleLabels } from "@/hooks/useCompetitions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Info, Eye, FileText, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CriterionSlider } from "@/components/scoring/CriterionSlider";
import { ScoreCard } from "@/components/shared/ScoreCard";

const SAMPLE_CONTESTANT = {
  id: "preview",
  user_id: "preview",
  competition_id: "preview",
  sub_event_id: null,
  full_name: "Jane Doe",
  age_category: "Adult",
  location: "New York, NY",
  email: "jane@example.com",
  phone: null,
  bio: null,
  status: "approved",
  sort_order: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  rules_acknowledged: true,
  rules_acknowledged_at: null,
  contestant_signature: null,
  contestant_signed_at: null,
  guardian_name: null,
  guardian_email: null,
  guardian_phone: null,
  guardian_signature: null,
  guardian_signed_at: null,
  profile_photo_url: null,
  performance_video_url: null,
  social_handles: null,
  special_entry_type: null,
};

export default function RubricPage() {
  const { id: competitionId } = useParams<{ id: string }>();
  const { data: comp, isLoading: compLoading } = useCompetition(competitionId);
  const { data: criteria, isLoading: criteriaLoading } = useRubricCriteria(competitionId);

  const isLoading = compLoading || criteriaLoading;

  const scaleLabels: RubricScaleLabels = (comp as any)?.rubric_scale_labels ?? { min: 1, max: 5, labels: {} };
  const scaleMin = scaleLabels.min ?? 1;
  const scaleMax = scaleLabels.max ?? 5;

  const [previewScores, setPreviewScores] = useState<Record<string, number>>({});

  const handleScoreChange = (criterionId: string, value: number) => {
    setPreviewScores((prev) => ({ ...prev, [criterionId]: value }));
  };

  const activeCriteria = criteria?.filter((c) => !c.is_bonus) ?? [];
  const bonusCriteria = criteria?.filter((c) => c.is_bonus) ?? [];

  // Build a mock JudgeScore for the score card preview
  const criterionScores: Record<string, number> = {};
  criteria?.forEach((c) => {
    criterionScores[c.id] = previewScores[c.id] ?? 0;
  });
  const rawTotal = Object.values(criterionScores).reduce((s, v) => s + v, 0);

  const mockJudgeScore = {
    id: "preview",
    sub_event_id: "preview",
    judge_id: "preview",
    contestant_registration_id: "preview",
    criterion_scores: criterionScores,
    raw_total: rawTotal,
    performance_duration_seconds: 180,
    time_penalty: 0,
    final_score: rawTotal,
    signed_at: null,
    is_certified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    comments: "Sample comment for preview",
    judge_signature: null,
  };

  const rubricCriteriaForCard = criteria?.map((c) => ({
    id: c.id,
    name: c.name,
    notes: c.notes,
  })) ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/competitions/${competitionId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Info className="h-6 w-6 text-primary" /> Scoring Rubric
          </h1>
          <p className="text-muted-foreground text-xs">{comp?.name || ""}</p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <Tabs defaultValue="rubric" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="rubric" className="text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Rubric
            </TabsTrigger>
            <TabsTrigger value="judge-preview" className="text-xs gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Judge Scoring Preview
            </TabsTrigger>
            <TabsTrigger value="scorecard-preview" className="text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Score Card Preview
            </TabsTrigger>
          </TabsList>

          {/* ── Rubric Tab ── */}
          <TabsContent value="rubric">
            <div className="space-y-4">
              {/* Scale legend */}
              <Card className="border-border/50 bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Scale Labels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i).map((n) => (
                      <Badge key={n} variant="outline" className="text-xs font-mono gap-1">
                        {n} — {scaleLabels.labels?.[String(n)] || `Level ${n}`}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Criteria cards */}
              <div className="grid gap-4">
                {criteria?.map((criterion) => (
                  <Card key={criterion.id} className="border-border/50 bg-card/80">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{criterion.name}</CardTitle>
                        {criterion.is_bonus && <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30"><Star className="h-3 w-3 mr-0.5" />Bonus</Badge>}
                      </div>
                      {criterion.guidelines && (
                        <p className="text-sm text-muted-foreground mt-1">{criterion.guidelines}</p>
                      )}
                      <CardDescription className="text-xs">
                        Weight: {criterion.weight_percent}%
                        {criterion.applies_to_categories?.length > 0 && (
                          <span className="ml-2 text-amber-600">· Category-specific</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className={`grid grid-cols-1 sm:grid-cols-${Math.min(scaleMax - scaleMin + 1, 5)} gap-2`}>
                        {Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i).map((level) => {
                          const desc = level <= 5
                            ? (criterion as any)[`description_${level}`]
                            : criterion.scale_descriptions?.[String(level)] || "";
                          const pointVal = criterion.point_values?.[String(level)];
                          return (
                            <div key={level} className="flex flex-col gap-1 p-2 rounded bg-muted/30 border border-border/30">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold font-mono text-primary">{level}</span>
                                {pointVal != null && <span className="text-[10px] font-mono text-muted-foreground">{pointVal}pts</span>}
                              </div>
                              <span className="text-[10px] font-medium text-foreground/70">
                                {scaleLabels.labels?.[String(level)] || `Level ${level}`}
                              </span>
                              <p className="text-[10px] text-muted-foreground leading-tight">{desc}</p>
                            </div>
                          );
                        })}
                      </div>
                      {criterion.notes && (
                        <p className="text-xs text-muted-foreground mt-2 border-t border-border/30 pt-2 italic">{criterion.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {(!criteria || criteria.length === 0) && (
                  <p className="text-sm text-muted-foreground italic py-4">No rubric criteria defined for this competition.</p>
                )}
              </div>
            </div>
          </TabsContent>

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
                {activeCriteria.length === 0 && bonusCriteria.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No criteria defined.</p>
                )}
                {activeCriteria.map((criterion) => (
                  <CriterionSlider
                    key={criterion.id}
                    criterion={criterion}
                    value={previewScores[criterion.id] || 0}
                    onChange={(v) => handleScoreChange(criterion.id, v)}
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
                    {bonusCriteria.map((criterion) => (
                      <CriterionSlider
                        key={criterion.id}
                        criterion={criterion}
                        value={previewScores[criterion.id] || 0}
                        onChange={(v) => handleScoreChange(criterion.id, v)}
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
                  competitionName={comp?.name || "Competition"}
                  judgeScore={mockJudgeScore as any}
                  judgeName="Judge Preview"
                  rubricCriteria={rubricCriteriaForCard}
                />
              </CardContent>
            </Card>

            {/* Blank card */}
            <Card className="border-border/50 bg-card/80 mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Blank Score Card</CardTitle>
                <CardDescription className="text-xs">What a blank printed card looks like.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <ScoreCard
                  contestant={SAMPLE_CONTESTANT as any}
                  subEventName="Sample Sub-Event"
                  competitionName={comp?.name || "Competition"}
                  isBlank
                  rubricCriteria={rubricCriteriaForCard}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
