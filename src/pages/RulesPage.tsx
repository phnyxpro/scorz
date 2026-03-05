import { useParams, Link } from "react-router-dom";
import { useCompetition } from "@/hooks/useCompetitions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, ExternalLink, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function RulesPage() {
  const { id: competitionId } = useParams<{ id: string }>();
  const { data: comp, isLoading } = useCompetition(competitionId);

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
            <FileText className="h-6 w-6 text-primary" /> Official Rules
          </h1>
          <p className="text-muted-foreground text-xs">{comp?.name || ""}</p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="space-y-4">
          {comp?.description && (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="pt-4">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{comp.description}</p>
              </CardContent>
            </Card>
          )}

          {(comp as any)?.rules_document_url && (
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
            !comp?.description && !(comp as any)?.rules_document_url && (
              <p className="text-sm text-muted-foreground italic">No rules have been published for this competition.</p>
            )
          )}
        </div>
      )}
    </div>
  );
}
