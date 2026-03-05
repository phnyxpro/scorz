import { useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { useCompetition, useRubricCriteria, usePenaltyRules } from "@/hooks/useCompetitions";
import { PublicRubric } from "@/components/public/PublicRubric";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, ExternalLink, BookOpen, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function RulesAndRubric() {
  const { id: competitionId } = useParams<{ id: string }>();
  const location = useLocation();
  const { data: comp, isLoading: compLoading } = useCompetition(competitionId);
  const { data: criteria, isLoading: criteriaLoading } = useRubricCriteria(competitionId);
  const { data: penalties, isLoading: penaltiesLoading } = usePenaltyRules(competitionId);

  const isLoading = compLoading || criteriaLoading || penaltiesLoading;
  const rulesContent = (comp as any)?.rules_content as string | undefined;
  const rubricContent = (comp as any)?.rubric_content as string | undefined;

  // Scroll to hash section on load
  useEffect(() => {
    if (!isLoading && location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [isLoading, location.hash]);

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
            <BookOpen className="h-6 w-6 text-primary" /> Rules & Rubric
          </h1>
          <p className="text-muted-foreground text-xs">{comp?.name || ""}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          {/* Official Rules */}
          <section id="rules" className="space-y-3 scroll-mt-20">
            <h2 className="text-lg font-bold font-mono flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Official Rules
            </h2>
            {comp?.description && (
              <Card className="border-border/50 bg-card/80">
                <CardContent className="pt-4">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{comp.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Extracted rules content */}
            {rulesContent && (
              <Card className="border-border/50 bg-card/80">
                <CardContent className="pt-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: rulesContent }} />
                </CardContent>
              </Card>
            )}

            {/* Fallback: iframe for PDF if no extracted content */}
            {!rulesContent && (comp as any)?.rules_document_url && (
              <Card className="border-border/50 bg-card/80 overflow-hidden">
                <CardContent className="p-0">
                  {(comp as any).rules_document_url.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={(comp as any).rules_document_url}
                      className="w-full h-[600px] border-0"
                      title="Rules Document"
                    />
                  ) : (
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex gap-3 items-center">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">Rules Document</p>
                          <p className="text-xs text-muted-foreground">Uploaded document</p>
                        </div>
                      </div>
                      <a
                        href={(comp as any).rules_document_url}
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

            {/* Download link when extracted content is shown */}
            {rulesContent && (comp as any)?.rules_document_url && (
              <Card className="border-border/50 bg-card/80">
                <CardContent className="pt-4 flex items-center justify-between gap-4">
                  <div className="flex gap-3 items-center">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Original Document</p>
                      <p className="text-xs text-muted-foreground">Download the full PDF</p>
                    </div>
                  </div>
                  <a
                    href={(comp as any).rules_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm flex items-center gap-1 hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </CardContent>
              </Card>
            )}

            {(comp as any)?.rules_url ? (
              <Card className="border-border/50 bg-card/80">
                <CardContent className="pt-4 flex items-center justify-between gap-4">
                  <div className="flex gap-3 items-center">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Competition Handbook</p>
                      <p className="text-xs text-muted-foreground">Official rules document</p>
                    </div>
                  </div>
                  <a
                    href={(comp as any).rules_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm flex items-center gap-1 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View
                  </a>
                </CardContent>
              </Card>
            ) : (
              !comp?.description && !rulesContent && !(comp as any)?.rules_document_url && (
                <p className="text-sm text-muted-foreground italic">No rules have been published for this competition.</p>
              )
            )}
          </section>

          {/* Scoring Rubric */}
          <section id="rubric" className="space-y-3 scroll-mt-20">
            {/* Extracted rubric content */}
            {rubricContent && (
              <Card className="border-border/50 bg-card/80 mb-4">
                <CardContent className="pt-4">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{rubricContent}</p>
                </CardContent>
              </Card>
            )}

            {/* Fallback: iframe for PDF if no extracted content */}
            {!rubricContent && (comp as any)?.rubric_document_url && (
              <Card className="border-border/50 bg-card/80 overflow-hidden mb-4">
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

            {/* Download link when extracted content is shown */}
            {rubricContent && (comp as any)?.rubric_document_url && (
              <Card className="border-border/50 bg-card/80 mb-4">
                <CardContent className="pt-4 flex items-center justify-between gap-4">
                  <div className="flex gap-3 items-center">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Original Document</p>
                      <p className="text-xs text-muted-foreground">Download the full PDF</p>
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
                </CardContent>
              </Card>
            )}

            <PublicRubric criteria={criteria || []} penalties={penalties || []} />
          </section>
        </>
      )}
    </div>
  );
}
