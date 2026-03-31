import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Upload, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useRegistrations } from "@/hooks/useRegistrations";
import { mapAgeCategory, isMinorCategory } from "@/lib/age-categories";
import { readXLSXToJson } from "@/lib/export-utils";
import {
  useRegistrationFormConfig,
  createDefaultFormSchema,
  type FormSchema,
} from "@/hooks/useRegistrationForm";

interface Props {
  competitionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AIRow {
  full_name: string;
  email: string;
  phone?: string;
  location?: string;
  age_category?: string;
  guardian_name?: string;
  guardian_email?: string;
  guardian_phone?: string;
  bio?: string;
  level_id?: string;
  level_name?: string;
  sub_event_id?: string;
  sub_event_name?: string;
  category_id?: string;
  category_name?: string;
  custom_fields?: Record<string, string>;
  confidence: "high" | "medium" | "low";
  warnings: string[];
  // local state
  included?: boolean;
}

const SKIP_FIELD_TYPES = new Set(["heading", "paragraph", "signature", "rules_acknowledgment", "repeater"]);

function useCompetitionHierarchy(competitionId: string) {
  return useQuery({
    queryKey: ["ai_upload_hierarchy", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const { data: levels } = await supabase
        .from("competition_levels")
        .select("id, name, sort_order")
        .eq("competition_id", competitionId)
        .order("sort_order");

      const levelIds = (levels || []).map((l) => l.id);
      let subEvents: any[] = [];
      let categories: any[] = [];

      if (levelIds.length) {
        const { data: se } = await supabase
          .from("sub_events")
          .select("id, name, level_id")
          .in("level_id", levelIds)
          .order("event_date");
        subEvents = se || [];

        const { data: cats } = await supabase
          .from("competition_categories")
          .select("id, name, level_id, parent_id")
          .in("level_id", levelIds)
          .order("sort_order");
        categories = cats || [];
      }

      return { levels: levels || [], subEvents, categories };
    },
  });
}

function extractFormFieldsForAI(schema: FormSchema) {
  const fields: any[] = [];
  for (const section of schema) {
    for (const f of section.fields) {
      if (SKIP_FIELD_TYPES.has(f.type)) continue;
      const entry: any = {
        key: f.key,
        type: f.type,
        label: f.label,
        required: f.required,
      };
      if (f.options?.length) {
        entry.options = f.options;
      }
      fields.push(entry);
    }
  }
  return fields;
}

export function AIUploadDialog({ competitionId, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: formConfig } = useRegistrationFormConfig(competitionId);
  const { data: hierarchy } = useCompetitionHierarchy(competitionId);
  const { data: existingRegs } = useRegistrations(competitionId);

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<AIRow[]>([]);
  const [defaultSubEventId, setDefaultSubEventId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importDone, setImportDone] = useState(false);

  const levels = hierarchy?.levels || [];
  const subEvents = hierarchy?.subEvents || [];

  const formSchema = useMemo(() => {
    return formConfig?.form_schema?.length ? formConfig.form_schema : createDefaultFormSchema();
  }, [formConfig]);

  const existingEmails = useMemo(
    () => new Set((existingRegs || []).map((r) => r.email.toLowerCase())),
    [existingRegs]
  );

  const reset = () => {
    setStep(0);
    setRows([]);
    setParsing(false);
    setImporting(false);
    setImportProgress(0);
    setImportDone(false);
    setDefaultSubEventId("");
  };

  // Read file content as text (CSV) or convert XLSX to CSV text
  const readFileAsText = useCallback(async (file: File): Promise<string> => {
    if (file.name.toLowerCase().endsWith(".csv")) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          let text = e.target?.result as string;
          if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
          resolve(text);
        };
        reader.onerror = reject;
        reader.readAsText(file, "UTF-8");
      });
    } else {
      // XLSX: read to JSON then convert to CSV text for the AI
      const buffer = await file.arrayBuffer();
      const json = await readXLSXToJson<Record<string, string>>(buffer);
      if (!json.length) throw new Error("Empty file");
      const headers = Object.keys(json[0]);
      const escapeCSV = (val: string) => {
        if (!val) return "";
        if (val.includes(",") || val.includes('"') || val.includes("\n"))
          return `"${val.replace(/"/g, '""')}"`;
        return val;
      };
      const csvLines = [
        headers.map(escapeCSV).join(","),
        ...json.map((row) => headers.map((h) => escapeCSV(row[h] || "")).join(",")),
      ];
      return csvLines.join("\n");
    }
  }, []);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setParsing(true);
      try {
        const csvText = await readFileAsText(file);
        const formFields = extractFormFieldsForAI(formSchema);

        const { data, error } = await supabase.functions.invoke("parse-registration-csv", {
          body: {
            csvText,
            formFields,
            hierarchy: hierarchy
              ? {
                  levels: hierarchy.levels,
                  subEvents: hierarchy.subEvents,
                  categories: hierarchy.categories,
                }
              : null,
          },
        });

        if (error) throw new Error(error.message || "AI parsing failed");

        const registrations: AIRow[] = (data?.registrations || []).map((r: any) => {
          const isDuplicate = r.email ? existingEmails.has(r.email.toLowerCase()) : false;
          const warnings = [...(r.warnings || [])];
          if (isDuplicate) warnings.push("Duplicate email");
          return {
            ...r,
            included: !!r.full_name && !!r.email && !isDuplicate,
            warnings,
          };
        });

        setRows(registrations);
        setStep(1);
      } catch (err: any) {
        console.error("AI parse error:", err);
        toast({
          title: "AI parsing failed",
          description: err.message || "Could not parse the file",
          variant: "destructive",
        });
      } finally {
        setParsing(false);
      }
    },
    [formSchema, hierarchy, existingEmails, readFileAsText]
  );

  const includedRows = rows.filter((r) => r.included);
  const errorCount = rows.filter((r) => !r.full_name || !r.email).length;
  const warningCount = rows.filter((r) => r.warnings.length > 0 && r.included).length;

  const handleImport = async () => {
    if (!user) return;
    setImporting(true);
    setImportProgress(0);

    const toImport = includedRows;
    let imported = 0;

    for (const row of toImport) {
      const resolvedSubEventId = row.sub_event_id || defaultSubEventId || null;
      const ageCategory = row.age_category ? mapAgeCategory(row.age_category) : "adult";

      const customFieldValues: Record<string, string> = { ...(row.custom_fields || {}) };
      if (row.category_id) {
        // Find category selector key from schema
        for (const section of formSchema) {
          for (const f of section.fields) {
            if (f.type === "category_selector") {
              customFieldValues[f.key] = row.category_id;
              break;
            }
          }
        }
      }

      const insertData: any = {
        competition_id: competitionId,
        user_id: user.id,
        full_name: row.full_name,
        email: row.email,
        phone: row.phone || null,
        location: row.location || null,
        age_category: ageCategory,
        bio: row.bio || null,
        guardian_name: row.guardian_name || null,
        guardian_email: row.guardian_email || null,
        guardian_phone: row.guardian_phone || null,
        sub_event_id: resolvedSubEventId,
        status: "approved",
        custom_field_values: customFieldValues,
        sort_order: imported,
      };

      const { error } = await supabase.from("contestant_registrations").insert(insertData);
      if (error) {
        console.error("Import error for", row.full_name, error);
      } else {
        imported++;
      }
      setImportProgress(Math.round(((imported) / toImport.length) * 100));
    }

    setImportDone(true);
    setImporting(false);
    qc.invalidateQueries({ queryKey: ["registrations", competitionId] });
    toast({
      title: `${imported} registration${imported !== 1 ? "s" : ""} imported`,
      description: imported < toImport.length
        ? `${toImport.length - imported} rows failed`
        : "All rows imported successfully",
    });
  };

  const confidenceBadge = (c: string) => {
    if (c === "high") return <Badge variant="outline" className="text-[10px] bg-secondary/20 text-secondary border-secondary/30">High</Badge>;
    if (c === "medium") return <Badge variant="outline" className="text-[10px] bg-primary/20 text-primary border-primary/30">Medium</Badge>;
    return <Badge variant="outline" className="text-[10px] bg-destructive/20 text-destructive border-destructive/30">Low</Badge>;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Upload with AI
          </DialogTitle>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={step === 0 ? "default" : "outline"} className="text-[10px]">1. Upload</Badge>
          <ArrowRight className="h-3 w-3" />
          <Badge variant={step === 1 ? "default" : "outline"} className="text-[10px]">2. Review</Badge>
          <ArrowRight className="h-3 w-3" />
          <Badge variant={step === 2 ? "default" : "outline"} className="text-[10px]">3. Import</Badge>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {/* Step 0: Upload */}
          {step === 0 && (
            <div className="space-y-4 py-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-3">
                {parsing ? (
                  <div className="space-y-3">
                    <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">AI is parsing your file…</p>
                    <p className="text-xs text-muted-foreground">This may take a few seconds</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Upload a CSV or XLSX file</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        AI will automatically map columns, match dropdown values, and handle messy data
                      </p>
                    </div>
                    <label className="inline-block cursor-pointer">
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                        <Sparkles className="h-4 w-4" />
                        Choose File
                      </span>
                    </label>
                  </>
                )}
              </div>

              {subEvents.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Default Sub-Event (used when AI can't determine one)
                  </label>
                  <Select value={defaultSubEventId} onValueChange={setDefaultSubEventId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select default sub-event" />
                    </SelectTrigger>
                    <SelectContent>
                      {subEvents.map((se) => (
                        <SelectItem key={se.id} value={se.id}>{se.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Review parsed rows */}
          {step === 1 && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-3 text-xs">
                <Badge variant="outline" className="gap-1">
                  <CheckCircle className="h-3 w-3 text-secondary" />
                  {includedRows.length} ready
                </Badge>
                {warningCount > 0 && (
                  <Badge variant="outline" className="gap-1 text-amber-600">
                    <AlertTriangle className="h-3 w-3" />
                    {warningCount} warnings
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="outline" className="gap-1 text-destructive">
                    <XCircle className="h-3 w-3" />
                    {errorCount} errors
                  </Badge>
                )}
              </div>

              <ScrollArea className="max-h-[50vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">✓</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Custom Fields</TableHead>
                      <TableHead>Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={idx} className={!row.included ? "opacity-50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={row.included}
                            onCheckedChange={(checked) => {
                              setRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, included: !!checked } : r
                                )
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {row.full_name || <span className="text-destructive">Missing</span>}
                        </TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">
                          {row.email || <span className="text-destructive">Missing</span>}
                        </TableCell>
                        <TableCell>{confidenceBadge(row.confidence)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {row.custom_fields
                            ? Object.entries(row.custom_fields)
                                .slice(0, 3)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join("; ")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {row.warnings.length > 0 && (
                            <div className="flex flex-col gap-0.5">
                              {row.warnings.map((w, wi) => (
                                <span key={wi} className="text-[10px] text-amber-600">{w}</span>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* Step 2: Importing */}
          {step === 2 && (
            <div className="py-8 space-y-4 text-center">
              {importing && (
                <>
                  <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Importing registrations…</p>
                  <Progress value={importProgress} className="h-2 max-w-xs mx-auto" />
                  <p className="text-xs text-muted-foreground">{importProgress}%</p>
                </>
              )}
              {importDone && (
                <>
                  <CheckCircle className="h-10 w-10 mx-auto text-secondary" />
                  <p className="text-sm font-medium">Import complete!</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-2 border-t border-border">
          <div>
            {step === 1 && (
              <Button variant="outline" size="sm" onClick={() => { setStep(0); setRows([]); }}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step === 1 && (
              <Button
                size="sm"
                disabled={includedRows.length === 0}
                onClick={() => {
                  setStep(2);
                  handleImport();
                }}
              >
                Import {includedRows.length} registration{includedRows.length !== 1 ? "s" : ""}
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
            {step === 2 && importDone && (
              <Button
                size="sm"
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
