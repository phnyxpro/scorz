import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, XCircle, FileSpreadsheet, Download } from "lucide-react";
import { useSubEvents, useLevels } from "@/hooks/useCompetitions";
import { useRegistrations } from "@/hooks/useRegistrations";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { mapAgeCategory, extractGuardianName, parseTimeSlot, getAgeCategoryLabel, isMinorCategory } from "@/lib/age-categories";
import { readXLSXToJson } from "@/lib/export-utils";
import {
  useRegistrationFormConfig,
  createDefaultFormSchema,
  BUILTIN_KEYS,
  type FormSchema,
  type FormField,
} from "@/hooks/useRegistrationForm";

// ─── Types ──────────────────────────────────────────────

/** A dynamic field derived from the form schema */
interface DynamicField {
  key: string;          // builtin key or custom field key
  label: string;
  required: boolean;
  builtin: boolean;
  dbColumn?: string;    // direct DB column for builtin fields
  fieldType: string;    // original form field type
}

interface ParsedRow {
  id: number;
  raw: Record<string, string>;
  builtinValues: Record<string, string>;
  customValues: Record<string, string>;
  resolvedSubEventId: string | null;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
  included: boolean;
}

interface Props {
  competitionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Non-data field types to skip ──────────────────────
const SKIP_FIELD_TYPES = new Set([
  "heading", "paragraph", "signature", "rules_acknowledgment",
]);

// ─── Builtin key → DB column mapping ──────────────────
const BUILTIN_DB_MAP: Record<string, string> = {
  full_name: "full_name",
  email: "email",
  phone: "phone",
  location: "location",
  age_category: "age_category",
  bio: "bio",
  performance_video_url: "performance_video_url",
  guardian_name: "guardian_name",
  guardian_email: "guardian_email",
  guardian_phone: "guardian_phone",
};

// ─── Helpers ────────────────────────────────────────────

function extractDynamicFields(schema: FormSchema): DynamicField[] {
  const fields: DynamicField[] = [];
  for (const section of schema) {
    for (const f of section.fields) {
      if (SKIP_FIELD_TYPES.has(f.type)) continue;
      // Skip selector types for template (they get a special column)
      if (f.type === "repeater") continue;
      const isBuiltin = !!f.builtin && BUILTIN_KEYS.has(f.key);
      // For level/subevent/category selectors, add a friendly column
      if (f.type === "level_selector" || f.type === "subevent_selector" ||
          f.type === "category_selector" || f.type === "subcategory_selector" ||
          f.type === "time_slot_selector") {
        fields.push({
          key: f.key,
          label: f.label,
          required: f.required,
          builtin: true,
          fieldType: f.type,
        });
        continue;
      }
      fields.push({
        key: f.key,
        label: f.label,
        required: f.required,
        builtin: isBuiltin,
        dbColumn: isBuiltin ? BUILTIN_DB_MAP[f.key] : undefined,
        fieldType: f.type,
      });
    }
  }
  return fields;
}

function fuzzyMatch(header: string, fields: DynamicField[]): string {
  const h = header.toLowerCase().trim();
  // Try exact label match first
  for (const f of fields) {
    if (f.label.toLowerCase() === h) return f.key;
  }
  // Try includes match
  for (const f of fields) {
    const lbl = f.label.toLowerCase();
    if (h.includes(lbl) || lbl.includes(h)) return f.key;
  }
  // Legacy fuzzy patterns for common builtin fields
  if (h.includes("name") && !h.includes("guard") && !h.includes("parent")) return "full_name";
  if (h.includes("email") && !h.includes("guard") && !h.includes("parent")) return "email";
  if (h.includes("phone") || h.includes("whatsapp") || h.includes("contact")) return "phone";
  if (h.includes("location") || h.includes("address") || h.includes("city")) return "location";
  if (h.includes("age") || h.includes("category")) return "age_category";
  if (h.includes("guardian") || h.includes("parent")) return "guardian_name";
  if (h.includes("slot") || h.includes("audition") || h.includes("time") || h.includes("schedule")) return "__time_slot_selector";
  if (h.includes("level") || h.includes("round") || h.includes("stage")) return "__level_selector";
  if (h.includes("sub-event") || h.includes("session") || h.includes("sub event")) return "__subevent_selector";
  return "";
}

function generateCsvTemplate(
  fields: DynamicField[],
  levels: { id: string; name: string }[],
  subEvents: { id: string; name: string }[],
  categories: { id: string; name: string }[],
): string {
  const headers = fields.map((f) => f.label);
  // Build example row
  const example = fields.map((f) => {
    if (f.key === "full_name") return "Jane Doe";
    if (f.key === "email") return "jane@example.com";
    if (f.key === "phone") return "+1234567890";
    if (f.key === "location") return "Kingston, Jamaica";
    if (f.key === "age_category") return "adult";
    if (f.key === "guardian_name") return "John Doe";
    if (f.key === "guardian_email") return "john@example.com";
    if (f.key === "guardian_phone") return "+1234567890";
    if (f.key === "bio") return "A brief biography...";
    if (f.key === "performance_video_url") return "https://youtube.com/watch?v=...";
    if (f.fieldType === "level_selector" && levels.length) return levels[0].name;
    if (f.fieldType === "subevent_selector" && subEvents.length) return subEvents[0].name;
    if (f.fieldType === "category_selector" && categories.length) return categories[0].name;
    if (f.fieldType === "subcategory_selector") return "";
    if (f.fieldType === "time_slot_selector") return "09:00-09:15";
    return "";
  });

  const escapeCSV = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n"))
      return `"${val.replace(/"/g, '""')}"`;
    return val;
  };

  return [
    headers.map(escapeCSV).join(","),
    example.map(escapeCSV).join(","),
  ].join("\n");
}

// ─── Hook: fetch all sub-events & categories for competition ────
function useCompetitionHierarchy(competitionId: string) {
  return useQuery({
    queryKey: ["bulk_upload_hierarchy", competitionId],
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

      return {
        levels: levels || [],
        subEvents,
        categories,
      };
    },
  });
}

// ─── Component ──────────────────────────────────────────

export function BulkUploadDialog({ competitionId, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: formConfig } = useRegistrationFormConfig(competitionId);
  const { data: hierarchy } = useCompetitionHierarchy(competitionId);
  const { data: existingRegs } = useRegistrations(competitionId);

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [defaultSubEventId, setDefaultSubEventId] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importDone, setImportDone] = useState(false);

  const levels = hierarchy?.levels || [];
  const subEvents = hierarchy?.subEvents || [];
  const categories = hierarchy?.categories || [];

  // Build dynamic fields from form schema
  const formSchema = useMemo(() => {
    return formConfig?.form_schema || createDefaultFormSchema();
  }, [formConfig]);

  const dynamicFields = useMemo(() => extractDynamicFields(formSchema), [formSchema]);

  const existingEmails = useMemo(
    () => new Set((existingRegs || []).map((r) => r.email.toLowerCase())),
    [existingRegs]
  );

  // ─── Step 0: Template Download ────────────────────────

  const handleDownloadTemplate = () => {
    const csv = generateCsvTemplate(dynamicFields, levels, subEvents, categories);
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk-upload-template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ─── Step 1: File Upload & Mapping ────────────────────

  const parseCSVText = useCallback((text: string): Record<string, string>[] => {
    const lines: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (inQuotes && text[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (current.trim()) lines.push(current);
        current = "";
        if (ch === '\r' && text[i + 1] === '\n') i++;
      } else {
        current += ch;
      }
    }
    if (current.trim()) lines.push(current);
    if (lines.length < 2) return [];

    const splitRow = (line: string): string[] => {
      const cols: string[] = [];
      let cur = "";
      let q = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
        else if (c === ',' && !q) { cols.push(cur.trim()); cur = ""; }
        else cur += c;
      }
      cols.push(cur.trim());
      return cols;
    };

    const hdrs = splitRow(lines[0]);
    return lines.slice(1).map((line) => {
      const vals = splitRow(line);
      const obj: Record<string, string> = {};
      hdrs.forEach((h, i) => { obj[h] = vals[i] || ""; });
      return obj;
    });
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const isCSV = file.name.toLowerCase().endsWith(".csv");

      if (isCSV) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            let text = evt.target?.result as string;
            // Strip BOM
            if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
            const json = parseCSVText(text);
            if (json.length === 0) { toast({ title: "Empty file", variant: "destructive" }); return; }
            const hdrs = Object.keys(json[0]);
            setHeaders(hdrs);
            setRawRows(json);
            const autoMap: Record<string, string> = {};
            const usedHeaders = new Set<string>();
            hdrs.forEach((h) => {
              const match = fuzzyMatch(h, dynamicFields);
              if (match && !autoMap[match] && !usedHeaders.has(h)) { autoMap[match] = h; usedHeaders.add(h); }
            });
            setMapping(autoMap);
          } catch {
            toast({ title: "Could not parse CSV file", variant: "destructive" });
          }
        };
        reader.readAsText(file, "UTF-8");
      } else {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const data = evt.target?.result as ArrayBuffer;
            const json = await readXLSXToJson<Record<string, string>>(data);
            if (json.length === 0) { toast({ title: "Empty file", variant: "destructive" }); return; }
            const hdrs = Object.keys(json[0]);
            setHeaders(hdrs);
            setRawRows(json);
            const autoMap: Record<string, string> = {};
            const usedHeaders = new Set<string>();
            hdrs.forEach((h) => {
              const match = fuzzyMatch(h, dynamicFields);
              if (match && !autoMap[match] && !usedHeaders.has(h)) { autoMap[match] = h; usedHeaders.add(h); }
            });
            setMapping(autoMap);
          } catch {
            toast({ title: "Could not parse file", variant: "destructive" });
          }
        };
        reader.readAsArrayBuffer(file);
      }
    },
    [dynamicFields, parseCSVText]
  );

  // ─── Step 2: Parse & Validate ─────────────────────────

  const handleProceedToPreview = () => {
    const rows: ParsedRow[] = rawRows.map((raw, idx) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const builtinValues: Record<string, string> = {};
      const customValues: Record<string, string> = {};
      let resolvedSubEventId: string | null = defaultSubEventId || null;

      for (const field of dynamicFields) {
        const csvHeader = mapping[field.key];
        const value = csvHeader ? (raw[csvHeader] || "").trim() : "";

        // Resolve selector fields
        if (field.fieldType === "level_selector") {
          // We don't store level directly, but we can use it to resolve sub-event
          continue;
        }
        if (field.fieldType === "subevent_selector") {
          if (value) {
            const match = subEvents.find(
              (se) => se.name.toLowerCase() === value.toLowerCase()
            );
            if (match) {
              resolvedSubEventId = match.id;
            } else {
              warnings.push(`Sub-event "${value}" not found`);
            }
          }
          continue;
        }
        if (field.fieldType === "category_selector" || field.fieldType === "subcategory_selector") {
          if (value) {
            const match = categories.find(
              (c) => c.name.toLowerCase() === value.toLowerCase()
            );
            if (match) {
              customValues[field.key] = match.id;
            } else {
              warnings.push(`Category "${value}" not found`);
            }
          }
          continue;
        }
        if (field.fieldType === "time_slot_selector") {
          // Store raw time slot for later slot creation
          if (value) builtinValues["__time_slot"] = value;
          continue;
        }

        // Required field check
        if (field.required && !value) {
          errors.push(`${field.label} required`);
        }

        if (field.builtin && field.dbColumn) {
          // Special handling for age_category
          if (field.key === "age_category") {
            builtinValues[field.dbColumn] = value ? mapAgeCategory(value) : "adult";
          } else {
            builtinValues[field.dbColumn] = value;
          }
        } else if (!field.builtin) {
          if (value) customValues[field.key] = value;
        }
      }

      // Email validation
      const email = (builtinValues.email || "").toLowerCase();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push("Invalid email");
      }

      // Guardian check for minors
      const ageCategory = builtinValues.age_category || "adult";
      if (isMinorCategory(ageCategory) && !builtinValues.guardian_name) {
        warnings.push("Minor without guardian");
      }

      const isDuplicate = email ? existingEmails.has(email) : false;
      if (isDuplicate) warnings.push("Duplicate email");

      return {
        id: idx,
        raw,
        builtinValues,
        customValues,
        resolvedSubEventId,
        errors,
        warnings,
        isDuplicate,
        included: errors.length === 0,
      };
    });
    setParsedRows(rows);
    setStep(2);
  };

  const validCount = parsedRows.filter((r) => r.included && r.errors.length === 0).length;
  const errorCount = parsedRows.filter((r) => r.errors.length > 0).length;
  const duplicateCount = parsedRows.filter((r) => r.isDuplicate).length;

  // Display columns for preview table
  const previewColumns = useMemo(() => {
    const cols: { key: string; label: string }[] = [];
    for (const f of dynamicFields) {
      if (f.fieldType === "level_selector") continue;
      if (f.fieldType === "time_slot_selector") {
        cols.push({ key: "__time_slot", label: "Time Slot" });
        continue;
      }
      if (f.fieldType === "subevent_selector") {
        cols.push({ key: "__sub_event", label: "Sub-Event" });
        continue;
      }
      if (f.builtin && f.dbColumn) {
        cols.push({ key: f.dbColumn, label: f.label });
      } else {
        cols.push({ key: `custom:${f.key}`, label: f.label });
      }
    }
    return cols;
  }, [dynamicFields]);

  function getPreviewCellValue(row: ParsedRow, col: { key: string; label: string }): string {
    if (col.key === "__sub_event") {
      if (row.resolvedSubEventId) {
        const se = subEvents.find((s) => s.id === row.resolvedSubEventId);
        return se?.name || row.resolvedSubEventId;
      }
      return "—";
    }
    if (col.key === "__time_slot") {
      return row.builtinValues["__time_slot"] || "—";
    }
    if (col.key.startsWith("custom:")) {
      const k = col.key.replace("custom:", "");
      return row.customValues[k] || "—";
    }
    return row.builtinValues[col.key] || "—";
  }

  // ─── Step 3: Import ───────────────────────────────────

  const handleImport = async () => {
    if (!user) return;
    const toImport = parsedRows.filter((r) => r.included && r.errors.length === 0);
    if (toImport.length === 0) return;

    setImporting(true);
    setImportProgress(0);

    const { data: maxData } = await supabase
      .from("contestant_registrations")
      .select("sort_order")
      .eq("competition_id", competitionId)
      .order("sort_order", { ascending: false })
      .limit(1);
    let sortOrder = (maxData?.[0]?.sort_order || 0) + 1;

    let completed = 0;
    for (const row of toImport) {
      const timeSlotRaw = row.builtinValues["__time_slot"];
      const timeSlot = timeSlotRaw ? parseTimeSlot(timeSlotRaw) : null;

      const insertData: Record<string, any> = {
        user_id: user.id,
        competition_id: competitionId,
        full_name: row.builtinValues.full_name || "",
        email: (row.builtinValues.email || "").toLowerCase(),
        phone: row.builtinValues.phone || null,
        location: row.builtinValues.location || null,
        age_category: row.builtinValues.age_category || "adult",
        bio: row.builtinValues.bio || null,
        performance_video_url: row.builtinValues.performance_video_url || null,
        guardian_name: row.builtinValues.guardian_name || null,
        guardian_email: row.builtinValues.guardian_email || null,
        guardian_phone: row.builtinValues.guardian_phone || null,
        status: "approved",
        rules_acknowledged: true,
        sort_order: sortOrder++,
        sub_event_id: row.resolvedSubEventId || null,
        custom_field_values: Object.keys(row.customValues).length > 0 ? row.customValues : {},
      };

      const { data: regData, error: regError } = await supabase
        .from("contestant_registrations")
        .insert(insertData as any)
        .select("id")
        .single();

      if (!regError && regData && timeSlot?.start_time && timeSlot?.end_time && row.resolvedSubEventId) {
        await supabase.from("performance_slots").insert({
          contestant_registration_id: regData.id,
          sub_event_id: row.resolvedSubEventId,
          start_time: timeSlot.start_time,
          end_time: timeSlot.end_time,
          is_booked: true,
          slot_index: completed,
        });
      }

      completed++;
      setImportProgress(Math.round((completed / toImport.length) * 100));
    }

    setImporting(false);
    setImportDone(true);
    qc.invalidateQueries({ queryKey: ["registrations", competitionId] });
    toast({ title: `${completed} contestants imported successfully` });
  };

  // ─── Reset ────────────────────────────────────────────

  const handleClose = () => {
    setStep(0);
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setDefaultSubEventId("");
    setParsedRows([]);
    setImporting(false);
    setImportProgress(0);
    setImportDone(false);
    onOpenChange(false);
  };

  // Check if required fields are mapped
  const requiredFieldsMapped = useMemo(() => {
    const requiredKeys = dynamicFields
      .filter((f) => f.required && f.key === "full_name" || f.key === "email")
      .map((f) => f.key);
    // At minimum need full_name and email
    return !!mapping["full_name"] && !!mapping["email"];
  }, [mapping, dynamicFields]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Bulk Upload Contestants — Step {step + 1} of 4
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-1 pt-2">
            {["Template", "Upload & Map", "Preview", "Import"].map((label, i) => (
              <div key={i} className="flex items-center gap-1">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                    i <= step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">{label}</span>
                {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {/* ─── Step 0: Download Template ─── */}
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Download a CSV template pre-configured with the fields from this competition's registration form. Fill it in, then proceed to upload.
            </p>

            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <p className="text-xs font-medium">Template includes {dynamicFields.length} fields:</p>
              <div className="flex flex-wrap gap-1.5">
                {dynamicFields.map((f) => (
                  <Badge
                    key={f.key}
                    variant="outline"
                    className={`text-[10px] ${f.required ? "border-primary/50 text-primary" : ""}`}
                  >
                    {f.label}
                    {f.required && <span className="text-destructive ml-0.5">*</span>}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Download CSV Template
              </Button>
              <Button size="sm" onClick={() => setStep(1)}>
                Continue to Upload <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step 1: Upload & Map ─── */}
        {step === 1 && (
          <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1">
            <div>
              <Label className="text-sm">Upload CSV or Excel File</Label>
              <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="mt-1" />
            </div>

            {headers.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground">
                  {rawRows.length} rows detected · {headers.length} columns
                </p>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Map Columns to Fields</p>
                  <ScrollArea className="h-[40vh] border rounded-md p-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-3">
                      {dynamicFields.map((field) => (
                        <div key={field.key} className="flex items-center gap-2">
                          <Label className="text-xs w-32 shrink-0 truncate" title={field.label}>
                            {field.label}
                            {field.required && <span className="text-destructive ml-0.5">*</span>}
                          </Label>
                          <Select
                            value={mapping[field.key] || "__none__"}
                            onValueChange={(v) =>
                              setMapping((m) => ({
                                ...m,
                                [field.key]: v === "__none__" ? "" : v,
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— Skip —</SelectItem>
                              {headers.map((h) => (
                                <SelectItem key={h} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {subEvents.length > 0 && (
                  <div>
                    <Label className="text-xs">Default Sub-Event (if not mapped in CSV)</Label>
                    <Select
                      value={defaultSubEventId || "__none__"}
                      onValueChange={(v) => setDefaultSubEventId(v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— None —</SelectItem>
                        {subEvents.map((se) => (
                          <SelectItem key={se.id} value={se.id}>
                            {se.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button size="sm" variant="outline" onClick={() => setStep(0)}>
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleProceedToPreview}
                    disabled={!requiredFieldsMapped}
                  >
                    Preview <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </>
            )}

            {headers.length === 0 && (
              <div className="flex justify-start">
                <Button size="sm" variant="outline" onClick={() => setStep(0)}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 2: Preview & Validate ─── */}
        {step === 2 && (
          <div className="space-y-3 flex flex-col min-h-0 flex-1">
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="h-3 w-3 text-secondary" /> {validCount} valid
              </Badge>
              {errorCount > 0 && (
                <Badge variant="outline" className="gap-1 border-destructive/50 text-destructive">
                  <XCircle className="h-3 w-3" /> {errorCount} errors
                </Badge>
              )}
              {duplicateCount > 0 && (
                <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-600">
                  <AlertTriangle className="h-3 w-3" /> {duplicateCount} duplicates
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 border rounded-md max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] w-8">✓</TableHead>
                    <TableHead className="text-[10px]">#</TableHead>
                    {previewColumns.slice(0, 7).map((col) => (
                      <TableHead key={col.key} className="text-[10px]">
                        {col.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-[10px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, i) => (
                    <TableRow
                      key={row.id}
                      className={
                        row.errors.length > 0
                          ? "bg-destructive/5"
                          : row.isDuplicate
                          ? "bg-amber-500/5"
                          : ""
                      }
                    >
                      <TableCell>
                        <Checkbox
                          checked={row.included}
                          disabled={row.errors.length > 0}
                          onCheckedChange={(v) =>
                            setParsedRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, included: !!v } : r
                              )
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      {previewColumns.slice(0, 7).map((col) => (
                        <TableCell key={col.key} className="text-[10px] max-w-[120px] truncate">
                          {col.key === "age_category" ? (
                            <Badge variant="outline" className="text-[9px]">
                              {getAgeCategoryLabel(getPreviewCellValue(row, col))}
                            </Badge>
                          ) : (
                            getPreviewCellValue(row, col)
                          )}
                        </TableCell>
                      ))}
                      <TableCell>
                        {row.errors.length > 0 ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] border-destructive/50 text-destructive"
                          >
                            {row.errors[0]}
                          </Badge>
                        ) : row.warnings.length > 0 ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] border-amber-500/50 text-amber-600"
                          >
                            {row.warnings[0]}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[9px] border-secondary/50 text-secondary"
                          >
                            OK
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-between">
              <Button size="sm" variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
              </Button>
              <Button size="sm" onClick={() => setStep(3)} disabled={validCount === 0}>
                Confirm Import <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Import ─── */}
        {step === 3 && (
          <div className="space-y-4">
            {!importDone ? (
              <>
                <div className="text-sm space-y-2">
                  <p>
                    <strong>{validCount}</strong> contestants will be imported as{" "}
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-secondary/20 text-secondary"
                    >
                      approved
                    </Badge>
                  </p>
                  {parsedRows.some((r) => r.included && r.resolvedSubEventId) && (
                    <p className="text-xs text-muted-foreground">
                      Contestants will be assigned to their mapped sub-events.
                    </p>
                  )}
                  {parsedRows.some(
                    (r) => r.included && r.builtinValues["__time_slot"]
                  ) && (
                    <p className="text-xs text-muted-foreground">
                      Performance slots will be created for rows with time data.
                    </p>
                  )}
                  {parsedRows.some(
                    (r) => r.included && Object.keys(r.customValues).length > 0
                  ) && (
                    <p className="text-xs text-muted-foreground">
                      Custom field values will be stored for{" "}
                      {new Set(
                        parsedRows
                          .filter((r) => r.included)
                          .flatMap((r) => Object.keys(r.customValues))
                      ).size}{" "}
                      custom fields.
                    </p>
                  )}
                </div>

                {importing && (
                  <div className="space-y-2">
                    <Progress value={importProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      {importProgress}%
                    </p>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStep(2)}
                    disabled={importing}
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                  </Button>
                  <Button size="sm" onClick={handleImport} disabled={importing}>
                    {importing ? "Importing…" : `Import ${validCount} Contestants`}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-3 py-4">
                <CheckCircle className="h-10 w-10 text-secondary mx-auto" />
                <p className="text-sm font-medium">Import Complete!</p>
                <p className="text-xs text-muted-foreground">
                  {validCount} contestants added successfully.
                </p>
                <Button size="sm" onClick={handleClose}>
                  Done
                </Button>
              </div>
            )}
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
