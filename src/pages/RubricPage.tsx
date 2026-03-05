import { useParams, Link } from "react-router-dom";
import { useCompetition, useRubricCriteria } from "@/hooks/useCompetitions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText } from "lucide-react";

export default function RubricPage() {
  const { id: competitionId } = useParams<{ id: string }>();
  const { data: comp, isLoading: compLoading } = useCompetition(competitionId);
  const { data: criteria, isLoading: criteriaLoading } = useRubricCriteria(competitionId);

  const isLoading = compLoading || criteriaLoading;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
        <div className="space-y-4">
          {/* Inline PDF viewer for uploaded rubric document */}
          {(comp as any)?.rubric_document_url && (
            <Card className="border-border/50 bg-card/80 overflow-hidden">
              <CardContent className="p-0">
                {(comp as any).rubric_document_url.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={(comp as any).rubric_document_url}
                    className="w-full h-[600px] border-0"
                    title="Rubric Document"
                  />
                ) : (
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="flex gap-3 items-center">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">Rubric Document</p>
                        <p className="text-xs text-muted-foreground">Uploaded document</p>
                      </div>
                    </div>
                    <a
                      href={(comp as any).rubric_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm flex items-center gap-1 hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Criteria cards */}
          <div className="grid gap-4">
            {criteria?.map((criterion) => (
              <Card key={criterion.id} className="border-border/50 bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{criterion.name}</CardTitle>
                  <CardDescription className="text-xs">Judged on a scale of 1-5</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div key={level} className="flex flex-col gap-1 p-2 rounded bg-muted/30 border border-border/30">
                        <span className="text-xs font-bold font-mono text-primary">{level}</span>
                        <span className="text-[10px] font-medium text-foreground/70">Level {level}</span>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {(criterion as any)[`description_${level}`]}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!criteria || criteria.length === 0) && (
              <p className="text-sm text-muted-foreground italic py-4">No rubric criteria defined for this competition.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
