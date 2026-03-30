import { useState, useCallback } from "react";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, BookOpen, Scale, Loader2, ScanSearch, Check } from "lucide-react";
import { DocumentUpload } from "@/components/shared/DocumentUpload";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { RubricBuilder } from "@/components/competition/RubricBuilder";
import { RubricPreview } from "@/components/competition/RubricPreview";
import { PenaltyConfig } from "@/components/competition/PenaltyConfig";

const categories = {
  rules: { label: "Rules", icon: FileText, description: "Add an external rules URL or upload a document that contestants and judges can reference." },
  rubric: { label: "Rubric", icon: BookOpen, description: "Upload a rubric document or build scoring criteria for judges to use during evaluation." },
  penalties: { label: "Penalties", icon: Scale, description: "Configure time penalties, general infractions, and disqualification rules." },
} as const;

type Category = keyof typeof categories;

interface Props {
  competitionId: string;
  comp: any;
  rulesUrl: string;
  setRulesUrl: (v: string) => void;
  rulesDocumentUrl: string;
  setRulesDocumentUrl: (v: string) => void;
  rulesContent: string;
  setRulesContent: (v: string) => void;
  rubricDocumentUrl: string;
  setRubricDocumentUrl: (v: string) => void;
  rubricContent: string;
  setRubricContent: (v: string) => void;
  autoSaveStatus: "idle" | "saving" | "saved";
  handleSave: () => void;
  scanDocument: (url: string, type: "rules" | "rubric") => void;
  scanningRules: boolean;
  scanningRubric: boolean;
  existingCriteria: any[] | undefined;
  updateIsPending: boolean;
}

export function GuidelinesPillLayout({
  competitionId, comp, rulesUrl, setRulesUrl, rulesDocumentUrl, setRulesDocumentUrl,
  rulesContent, setRulesContent, rubricDocumentUrl, setRubricDocumentUrl,
  rubricContent, setRubricContent, autoSaveStatus, handleSave, scanDocument,
  scanningRules, scanningRubric, existingCriteria, updateIsPending,
}: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>("rules");
  const keys = Object.keys(categories) as Category[];
  const swipeNav = useCallback((dir: 1 | -1) => {
    setActiveCategory(prev => {
      const i = keys.indexOf(prev);
      const next = i + dir;
      return next >= 0 && next < keys.length ? keys[next] : prev;
    });
  }, [keys]);
  const swipeHandlers = useSwipeGesture({ onSwipeLeft: () => swipeNav(1), onSwipeRight: () => swipeNav(-1) });

  const ActiveIcon = categories[activeCategory].icon;

  return (
    <div className="space-y-4">
      {/* Category pill bar */}
      <div className="flex overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        <div className="flex gap-2 min-w-max">
          {keys.map((key) => {
            const cat = categories[key];
            const Icon = cat.icon;
            const isActive = activeCategory === key;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 min-h-[44px] rounded-full text-sm font-medium border transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rules */}
      {activeCategory === "rules" && (
        <Card className="rounded-xl border-border/50 bg-card/80" {...swipeHandlers}>
          <CardContent className="p-3 sm:p-5 space-y-4">
            <div className="space-y-2">
              <Badge className="rounded-full gap-1.5 px-3 py-1 text-xs">
                <ActiveIcon className="h-3.5 w-3.5" />
                {categories[activeCategory].label}
              </Badge>
              <p className="text-sm text-muted-foreground">{categories[activeCategory].description}</p>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Competition Rules URL</label>
              <Input placeholder="https://..." value={rulesUrl} onChange={e => setRulesUrl(e.target.value)} />
            </div>
            <DocumentUpload
              currentUrl={rulesDocumentUrl || null}
              folder={`rules/${competitionId}`}
              label="Rules Document"
              onUploaded={async (url) => {
                setRulesDocumentUrl(url);
                const { supabase } = await import("@/integrations/supabase/client");
                await supabase.from("competitions").update({ rules_document_url: url } as any).eq("id", competitionId);
                scanDocument(url, "rules");
              }}
              onRemoved={() => setRulesDocumentUrl("")}
            />

            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-xs text-muted-foreground">Rules Content</label>
                {autoSaveStatus === "saving" && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span>}
                {autoSaveStatus === "saved" && <span className="text-[10px] text-secondary flex items-center gap-1"><Check className="h-3 w-3" />Saved</span>}
              </div>
              <RichTextEditor content={rulesContent} onChange={setRulesContent} placeholder="Scan a document or type rules content here..." />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSave} disabled={updateIsPending}>
                {updateIsPending ? "Saving…" : "Save Changes"}
              </Button>
              {rulesDocumentUrl && (
                <Button variant="outline" onClick={() => scanDocument(rulesDocumentUrl, "rules")} disabled={scanningRules}>
                  {scanningRules ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ScanSearch className="h-4 w-4 mr-1" />}
                  {scanningRules ? "Scanning…" : "Scan Document"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rubric */}
      {activeCategory === "rubric" && (
        <div className="space-y-4" {...swipeHandlers}>
          <Card className="rounded-xl border-border/50 bg-card/80">
            <CardContent className="p-3 sm:p-5 space-y-4">
              <div className="space-y-2">
                <Badge className="rounded-full gap-1.5 px-3 py-1 text-xs">
                  <ActiveIcon className="h-3.5 w-3.5" />
                  {categories[activeCategory].label}
                </Badge>
                <p className="text-sm text-muted-foreground">{categories[activeCategory].description}</p>
              </div>

              <DocumentUpload
                currentUrl={rubricDocumentUrl || null}
                folder={`rubric/${competitionId}`}
                label="Rubric Document"
                onUploaded={async (url) => {
                  setRubricDocumentUrl(url);
                  const { supabase } = await import("@/integrations/supabase/client");
                  await supabase.from("competitions").update({ rubric_document_url: url } as any).eq("id", competitionId);
                  scanDocument(url, "rubric");
                }}
                onRemoved={() => setRubricDocumentUrl("")}
              />

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-xs text-muted-foreground">Rubric Content</label>
                  {autoSaveStatus === "saving" && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span>}
                  {autoSaveStatus === "saved" && <span className="text-[10px] text-secondary flex items-center gap-1"><Check className="h-3 w-3" />Saved</span>}
                </div>
                <RichTextEditor content={rubricContent} onChange={setRubricContent} placeholder="Scan a document or type rubric content here..." />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSave} disabled={updateIsPending}>
                  {updateIsPending ? "Saving…" : "Save Changes"}
                </Button>
                {rubricDocumentUrl && (
                  <Button variant="outline" onClick={() => scanDocument(rubricDocumentUrl, "rubric")} disabled={scanningRubric}>
                    {scanningRubric ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ScanSearch className="h-4 w-4 mr-1" />}
                    {scanningRubric ? "Scanning…" : "Scan & Extract Criteria"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          <RubricBuilder competitionId={competitionId} />
          <RubricPreview
            criteria={existingCriteria || []}
            scaleLabels={comp?.rubric_scale_labels ?? { min: 1, max: 5, labels: {} }}
            competitionName={comp?.name || "Competition"}
          />
        </div>
      )}

      {/* Penalties */}
      {activeCategory === "penalties" && (
        <div {...swipeHandlers}>
          <PenaltyConfig competitionId={competitionId} />
        </div>
      )}
    </div>
  );
}
