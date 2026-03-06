import { useParams } from "react-router-dom";
import { DetailPageSkeleton } from "@/components/shared/PageSkeletons";
import { useCompetition, useUpdateCompetition, useCreateRubricCriterion, useRubricCriteria } from "@/hooks/useCompetitions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LevelsManager } from "@/components/competition/LevelsManager";
import { RubricBuilder } from "@/components/competition/RubricBuilder";
import { PenaltyConfig } from "@/components/competition/PenaltyConfig";
import { SubEventAssignments } from "@/components/competition/SubEventAssignments";
import { SponsorsManager } from "@/components/competition/SponsorsManager";
import { ScoringSettingsManager } from "@/components/competition/ScoringSettingsManager";
import { ActiveScoringManager } from "@/components/competition/ActiveScoringManager";
import { BrandingManager } from "@/components/competition/BrandingManager";

import { BannerUpload } from "@/components/shared/BannerUpload";
import { DocumentUpload } from "@/components/shared/DocumentUpload";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { RegistrationsManager } from "@/components/competition/RegistrationsManager";
import { SlotsManager } from "@/components/competition/SlotsManager";
import { useState, useEffect } from "react";
import { ArrowLeft, FileText, BookOpen, Loader2, ScanSearch, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ScannedCriterion {
  name: string;
  description_1: string;
  description_2: string;
  description_3: string;
  description_4: string;
  description_5: string;
}

export default function CompetitionDetail() {
  const { id } = useParams<{ id: string }>();
  // Fix content where HTML tags were stored as escaped text (e.g. from bad paste)
  const fixEscapedHtml = (html: string): string => {
    if (!html) return html;
    const div = document.createElement("div");
    div.innerHTML = html;
    const text = div.textContent || "";
    if (text.trimStart().startsWith("<p>") || text.includes("</p><p>")) {
      return text;
    }
    return html;
  };

  const { hasRole, loading: authLoading } = useAuth();
  const { data: comp, isLoading } = useCompetition(id);
  const { data: existingCriteria } = useRubricCriteria(id);
  const update = useUpdateCompetition();
  const createCriterion = useCreateRubricCriterion();
  const qc = useQueryClient();

  const canConfigure = hasRole("admin") || hasRole("organizer");

  // Competition is locked when active or completed — core fields can't be edited
  const isLocked = comp ? (comp.status === "active" || comp.status === "completed") : false;
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [rulesUrl, setRulesUrl] = useState("");
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [showPeoplesChoice, setShowPeoplesChoice] = useState(false);
  
  const [rulesDocumentUrl, setRulesDocumentUrl] = useState("");
  const [rubricDocumentUrl, setRubricDocumentUrl] = useState("");
  const [rulesContent, setRulesContent] = useState("");
  const [rubricContent, setRubricContent] = useState("");

  // Scanning state
  const [scanningRules, setScanningRules] = useState(false);
  const [scanningRubric, setScanningRubric] = useState(false);
  const [pendingRubricCriteria, setPendingRubricCriteria] = useState<ScannedCriterion[] | null>(null);

  useEffect(() => {
    if (comp) {
      setName(comp.name);
      setSlug((comp as any).slug || "");
      setDescription(comp.description || "");
      setStartDate(comp.start_date || "");
      setEndDate(comp.end_date || "");
      setStatus(comp.status);
      setRulesUrl((comp as any).rules_url || "");
      setSocialLinks((comp as any).social_links || {});
      
      setRulesDocumentUrl((comp as any).rules_document_url || "");
      setRubricDocumentUrl((comp as any).rubric_document_url || "");
      setRulesContent(fixEscapedHtml((comp as any).rules_content || ""));
      setRubricContent(fixEscapedHtml((comp as any).rubric_content || ""));
      setShowPeoplesChoice((comp as any).show_peoples_choice_to_contestants || false);
    }
  }, [comp]);

  const handleSave = async () => {
    if (!id) return;
    update.mutate({ id, name, description, start_date: startDate || undefined, end_date: endDate || undefined, status });
    await supabase.from("competitions").update({ rules_url: rulesUrl || null, social_links: socialLinks, slug: slug || undefined, rules_document_url: rulesDocumentUrl || null, rubric_document_url: rubricDocumentUrl || null, rules_content: rulesContent || null, rubric_content: rubricContent || null, show_peoples_choice_to_contestants: showPeoplesChoice } as any).eq("id", id);
    qc.invalidateQueries({ queryKey: ["competition", id] });
  };

  const scanDocument = async (url: string, type: "rules" | "rubric") => {
    if (!id) return;
    const setScanning = type === "rules" ? setScanningRules : setScanningRubric;
    setScanning(true);

    try {
      const { data, error } = await supabase.functions.invoke("parse-pdf", {
        body: { url, type },
      });

      if (error) throw error;

      if (type === "rules") {
        await supabase.from("competitions").update({ rules_content: data.content } as any).eq("id", id);
        setRulesContent(data.content);
        qc.invalidateQueries({ queryKey: ["competition", id] });
        toast({ title: "Rules scanned", description: "Document content extracted into the editor." });
      } else {
        // Save raw text
        await supabase.from("competitions").update({ rubric_content: data.raw_text } as any).eq("id", id);
        setRubricContent(data.raw_text);
        qc.invalidateQueries({ queryKey: ["competition", id] });

        if (data.criteria && data.criteria.length > 0) {
          setPendingRubricCriteria(data.criteria);
        } else {
          toast({ title: "Rubric scanned", description: "Document text extracted. No scoring criteria could be identified." });
        }
      }
    } catch (e: any) {
      toast({ title: "Scan failed", description: e.message || "Could not extract document content", variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const applyRubricCriteria = () => {
    if (!pendingRubricCriteria || !id) return;
    const startOrder = existingCriteria?.length || 0;
    pendingRubricCriteria.forEach((c, i) => {
      createCriterion.mutate({
        competition_id: id,
        name: c.name,
        guidelines: null,
        sort_order: startOrder + i,
        weight_percent: 0,
        description_1: c.description_1,
        description_2: c.description_2,
        description_3: c.description_3,
        description_4: c.description_4,
        description_5: c.description_5,
      });
    });
    setPendingRubricCriteria(null);
    toast({ title: "Criteria added", description: `${pendingRubricCriteria.length} criteria imported from document.` });
  };

  const updateSocial = (key: string, val: string) => {
    setSocialLinks(prev => ({ ...prev, [key]: val }));
  };

  useEffect(() => {
    if (!authLoading && !canConfigure) {
      toast({ title: "Unauthorized", description: "You don't have permission to access this page.", variant: "destructive" });
    }
  }, [authLoading, canConfigure]);

  if (!authLoading && !canConfigure) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading || authLoading) return <DetailPageSkeleton />;
  if (!comp) return <div className="text-muted-foreground">Competition not found</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link to="/competitions"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{comp.name}</h1>
          <p className="text-muted-foreground text-sm">Configure competition settings</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="w-full flex overflow-x-auto no-scrollbar">
          <TabsTrigger value="general" className="flex-shrink-0">General</TabsTrigger>
          <TabsTrigger value="levels" className="flex-shrink-0">Schedule</TabsTrigger>
          <TabsTrigger value="rules" className="flex-shrink-0">Rules</TabsTrigger>
          <TabsTrigger value="rubric" className="flex-shrink-0">Rubric</TabsTrigger>
          <TabsTrigger value="penalties" className="flex-shrink-0">Penalties</TabsTrigger>
          <TabsTrigger value="scoring" className="flex-shrink-0">Scoring</TabsTrigger>
          <TabsTrigger value="registrations" className="flex-shrink-0">Registrations</TabsTrigger>
          <TabsTrigger value="slots" className="flex-shrink-0">Time Slots</TabsTrigger>
          <TabsTrigger value="assignments" className="flex-shrink-0">Staff</TabsTrigger>
          <TabsTrigger value="sponsors" className="flex-shrink-0">Sponsors</TabsTrigger>
          <TabsTrigger value="branding" className="flex-shrink-0">Branding</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="border-border/50 bg-card/80">
            <CardHeader><CardTitle className="text-base">Competition Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <BannerUpload
                currentUrl={(comp as any).banner_url}
                folder={`competitions/${id}`}
                aspectLabel="Main Event Banner"
                onUploaded={async (url) => {
                  await supabase.from("competitions").update({ banner_url: url } as any).eq("id", id!);
                  qc.invalidateQueries({ queryKey: ["competition", id] });
                }}
                onRemoved={async () => {
                  await supabase.from("competitions").update({ banner_url: null } as any).eq("id", id!);
                  qc.invalidateQueries({ queryKey: ["competition", id] });
                }}
              />
              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <div>
                <label className="text-xs text-muted-foreground">URL Slug</label>
                <Input
                  placeholder="e.g. my-competition-2026"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                />
                <p className="text-[10px] text-muted-foreground mt-1">Public URL: /events/{slug || '...'}</p>
              </div>
              <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Start Date</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">End Date</label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Social Links */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">Social Media Links</label>
                {["facebook", "instagram", "x", "youtube", "tiktok"].map(platform => (
                  <Input
                    key={platform}
                    placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                    value={socialLinks[platform] || ""}
                    onChange={e => updateSocial(platform, e.target.value)}
                  />
                ))}
              </div>

              {/* People's Choice Visibility Toggle */}
              <div className="flex items-center justify-between rounded-md border border-border/50 p-3">
                <div>
                  <Label htmlFor="pc-toggle" className="text-sm font-medium">Show People's Choice to Contestants</Label>
                  <p className="text-xs text-muted-foreground">Allow contestants to see their audience vote counts on the feedback page</p>
                </div>
                <Switch id="pc-toggle" checked={showPeoplesChoice} onCheckedChange={setShowPeoplesChoice} />
              </div>

              <Button onClick={handleSave} disabled={update.isPending}>
                {update.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="levels">
          <LevelsManager competitionId={id!} />
        </TabsContent>

        <TabsContent value="rules">
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Competition Rules</CardTitle>
              </div>
              <CardDescription>Add an external rules URL or upload a document (PDF, DOCX, TXT) that contestants and judges can reference.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Competition Rules URL</label>
                <Input placeholder="https://..." value={rulesUrl} onChange={e => setRulesUrl(e.target.value)} />
              </div>
              <DocumentUpload
                currentUrl={rulesDocumentUrl || null}
                folder={`rules/${id}`}
                label="Rules Document"
                onUploaded={async (url) => {
                  setRulesDocumentUrl(url);
                  // Auto-save and scan
                  await supabase.from("competitions").update({ rules_document_url: url } as any).eq("id", id!);
                  scanDocument(url, "rules");
                }}
                onRemoved={() => setRulesDocumentUrl("")}
              />

              {/* Rich text editor for rules content */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Rules Content</label>
                <RichTextEditor
                  content={rulesContent}
                  onChange={setRulesContent}
                  placeholder="Scan a document or type rules content here..."
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={update.isPending}>
                  {update.isPending ? "Saving…" : "Save Changes"}
                </Button>
                {rulesDocumentUrl && (
                  <Button
                    variant="outline"
                    onClick={() => scanDocument(rulesDocumentUrl, "rules")}
                    disabled={scanningRules}
                  >
                    {scanningRules ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ScanSearch className="h-4 w-4 mr-1" />}
                    {scanningRules ? "Scanning…" : "Scan Document"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rubric">
          <div className="space-y-4">
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Scoring Rubric</CardTitle>
                </div>
                <CardDescription>Upload a rubric document (PDF, DOCX, TXT) or build scoring criteria below for judges to use during evaluation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <DocumentUpload
                  currentUrl={rubricDocumentUrl || null}
                  folder={`rubric/${id}`}
                  label="Rubric Document"
                  onUploaded={async (url) => {
                    setRubricDocumentUrl(url);
                    await supabase.from("competitions").update({ rubric_document_url: url } as any).eq("id", id!);
                    scanDocument(url, "rubric");
                  }}
                  onRemoved={() => setRubricDocumentUrl("")}
                />

              {/* Rich text editor for rubric content */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Rubric Content</label>
                <RichTextEditor
                  content={rubricContent}
                  onChange={setRubricContent}
                  placeholder="Scan a document or type rubric content here..."
                />
              </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={update.isPending}>
                    {update.isPending ? "Saving…" : "Save Changes"}
                  </Button>
                  {rubricDocumentUrl && (
                    <Button
                      variant="outline"
                      onClick={() => scanDocument(rubricDocumentUrl, "rubric")}
                      disabled={scanningRubric}
                    >
                      {scanningRubric ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ScanSearch className="h-4 w-4 mr-1" />}
                      {scanningRubric ? "Scanning…" : "Scan & Extract Criteria"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            <RubricBuilder competitionId={id!} />
          </div>
        </TabsContent>

        <TabsContent value="penalties">
          <PenaltyConfig competitionId={id!} />
        </TabsContent>

        <TabsContent value="registrations">
          <RegistrationsManager competitionId={id!} />
        </TabsContent>

        <TabsContent value="slots">
          <SlotsManager competitionId={id!} />
        </TabsContent>

        <TabsContent value="assignments">
          <SubEventAssignments competitionId={id!} competitionName={comp?.name} />
        </TabsContent>

        <TabsContent value="scoring">
          {comp && (
            <ActiveScoringManager
              competitionId={id!}
              activeLevelId={comp?.active_scoring_level_id}
              activeSubEventId={comp?.active_scoring_sub_event_id}
            />
          )}
          <ScoringSettingsManager competitionId={id!} />
        </TabsContent>

        <TabsContent value="sponsors">
          <SponsorsManager competitionId={id!} />
        </TabsContent>

        <TabsContent value="branding">
          <BrandingManager competitionId={id!} competition={comp} />
        </TabsContent>
      </Tabs>

      {/* Rubric criteria confirmation dialog */}
      <AlertDialog open={!!pendingRubricCriteria} onOpenChange={(open) => !open && setPendingRubricCriteria(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Rubric Criteria?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRubricCriteria?.length} scoring criteria were extracted from the document. Would you like to add them to the rubric builder?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-48 overflow-y-auto space-y-1 my-2">
            {pendingRubricCriteria?.map((c, i) => (
              <div key={i} className="text-xs bg-muted/30 rounded px-2 py-1.5 font-medium">{c.name}</div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Skip</AlertDialogCancel>
            <AlertDialogAction onClick={applyRubricCriteria}>Import Criteria</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
