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
import { Upload, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, XCircle, FileSpreadsheet } from "lucide-react";
import { useSubEvents, useLevels } from "@/hooks/useCompetitions";
import { useRegistrations } from "@/hooks/useRegistrations";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { mapAgeCategory, extractGuardianName, parseTimeSlot, getAgeCategoryLabel, isMinorCategory } from "@/lib/age-categories";
import * as XLSX from "xlsx";

// Registration fields we map to
const FIELD_OPTIONS = [
  { key: "name", label: "Full Name", required: true },
  { key: "email", label: "Email", required: true },
  { key: "phone", label: "Phone" },
  { key: "location", label: "Location" },
  { key: "age_category", label: "Age Category" },
  { key: "consent", label: "Guardian / Consent" },
  { key: "time_slot", label: "Time Slot" },
] as const;

type FieldKey = (typeof FIELD_OPTIONS)[number]["key"];

interface ParsedRow {
  id: number;
  raw: Record<string, string>;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  age_category: string;
  guardian_name: string;
  start_time: string;
  end_time: string;
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

function fuzzyMatch(header: string): FieldKey | "" {
  const h = header.toLowerCase().trim();
  if (h.includes("name") && !h.includes("guard") && !h.includes("parent")) return "name";
  if (h.includes("email") && !h.includes("guard") && !h.includes("parent")) return "email";
  if (h.includes("phone") || h.includes("whatsapp") || h.includes("contact")) return "phone";
  if (h.includes("location") || h.includes("address") || h.includes("city")) return "location";
  if (h.includes("age") || h.includes("category")) return "age_category";
  if (h.includes("consent") || h.includes("guardian") || h.includes("parent") || h.includes("fill in")) return "consent";
  if (h.includes("slot") || h.includes("audition") || h.includes("slam") || h.includes("time") || h.includes("schedule")) return "time_slot";
  return "";
}

export function BulkUploadDialog({ competitionId, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: levels } = useLevels(competitionId);
  const firstLevelId = levels?.[0]?.id;
  const { data: subEvents } = useSubEvents(firstLevelId);
  const { data: existingRegs } = useRegistrations(competitionId);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, string>>({} as any);
  const [subEventId, setSubEventId] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importDone, setImportDone] = useState(false);

  const existingEmails = useMemo(() => new Set((existingRegs || []).map((r) => r.email.toLowerCase())), [existingRegs]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
        if (json.length === 0) {
          toast({ title: "Empty file", variant: "destructive" });
          return;
        }
        const hdrs = Object.keys(json[0]);
        setHeaders(hdrs);
        setRawRows(json);
        // Auto-map
        const autoMap: Record<string, string> = {};
        hdrs.forEach((h) => {
          const match = fuzzyMatch(h);
          if (match && !Object.values(autoMap).includes(h)) {
            // Only set if this field isn't already mapped
            if (!autoMap[match]) autoMap[match] = h;
          }
        });
        setMapping(autoMap as any);
      } catch {
        toast({ title: "Could not parse file", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleProceedToPreview = () => {
    const rows: ParsedRow[] = rawRows.map((raw, idx) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      const nameRaw = (mapping.name ? raw[mapping.name] : "").trim();
      const emailRaw = (mapping.email ? raw[mapping.email] : "").trim().toLowerCase();
      const phoneRaw = (mapping.phone ? raw[mapping.phone] : "").trim();
      const locationRaw = (mapping.location ? raw[mapping.location] : "").trim();
      const ageRaw = (mapping.age_category ? raw[mapping.age_category] : "").trim();
      const consentRaw = (mapping.consent ? raw[mapping.consent] : "").trim();
      const timeRaw = (mapping.time_slot ? raw[mapping.time_slot] : "").trim();

      if (!nameRaw) errors.push("Name required");
      if (!emailRaw) errors.push("Email required");
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) errors.push("Invalid email");

      const ageCategory = ageRaw ? mapAgeCategory(ageRaw) : "adult";
      let guardianName = "";
      if (isMinorCategory(ageCategory)) {
        if (consentRaw) {
          guardianName = extractGuardianName(consentRaw);
          if (!guardianName) warnings.push("Could not extract guardian name");
        } else {
          warnings.push("Minor without consent info");
        }
      }

      const timeSlot = timeRaw ? parseTimeSlot(timeRaw) : null;
      const isDuplicate = existingEmails.has(emailRaw);
      if (isDuplicate) warnings.push("Duplicate email");

      return {
        id: idx,
        raw,
        full_name: nameRaw,
        email: emailRaw,
        phone: phoneRaw,
        location: locationRaw,
        age_category: ageCategory,
        guardian_name: guardianName,
        start_time: timeSlot?.start_time || "",
        end_time: timeSlot?.end_time || "",
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

  const handleImport = async () => {
    if (!user) return;
    const toImport = parsedRows.filter((r) => r.included && r.errors.length === 0);
    if (toImport.length === 0) return;

    setImporting(true);
    setImportProgress(0);

    // Get current max sort_order
    const { data: maxData } = await supabase
      .from("contestant_registrations")
      .select("sort_order")
      .eq("competition_id", competitionId)
      .order("sort_order", { ascending: false })
      .limit(1);
    let sortOrder = (maxData?.[0]?.sort_order || 0) + 1;

    let completed = 0;
    for (const row of toImport) {
      // Insert registration
      const { data: regData, error: regError } = await supabase
        .from("contestant_registrations")
        .insert({
          user_id: user.id,
          competition_id: competitionId,
          full_name: row.full_name,
          email: row.email,
          phone: row.phone || null,
          location: row.location || null,
          age_category: row.age_category,
          guardian_name: row.guardian_name || null,
          status: "approved",
          rules_acknowledged: true,
          sort_order: sortOrder++,
          sub_event_id: subEventId || null,
        } as any)
        .select("id")
        .single();

      // Create performance slot if we have time data and sub_event
      if (!regError && regData && row.start_time && row.end_time && subEventId) {
        await supabase.from("performance_slots").insert({
          contestant_registration_id: regData.id,
          sub_event_id: subEventId,
          start_time: row.start_time,
          end_time: row.end_time,
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

  const handleClose = () => {
    setStep(1);
    setHeaders([]);
    setRawRows([]);
    setMapping({} as any);
    setSubEventId("");
    setParsedRows([]);
    setImporting(false);
    setImportProgress(0);
    setImportDone(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Bulk Upload Contestants — Step {step} of 3
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: File & Mapping */}
        {step === 1 && (
          <div className="space-y-4 overflow-y-auto">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {FIELD_OPTIONS.map((field) => (
                      <div key={field.key} className="flex items-center gap-2">
                        <Label className="text-xs w-28 shrink-0">
                          {field.label}
                          {"required" in field && field.required && <span className="text-destructive ml-0.5">*</span>}
                        </Label>
                        <Select
                          value={mapping[field.key] || "__none__"}
                          onValueChange={(v) =>
                            setMapping((m) => ({ ...m, [field.key]: v === "__none__" ? "" : v }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
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
                </div>

                {subEvents && subEvents.length > 0 && (
                  <div>
                    <Label className="text-xs">Assign to Sub-Event (optional)</Label>
                    <Select value={subEventId || "__none__"} onValueChange={(v) => setSubEventId(v === "__none__" ? "" : v)}>
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

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleProceedToPreview}
                    disabled={!mapping.name || !mapping.email}
                  >
                    Preview <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Preview */}
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
                    <TableHead className="text-[10px]">Name</TableHead>
                    <TableHead className="text-[10px]">Email</TableHead>
                    <TableHead className="text-[10px]">Phone</TableHead>
                    <TableHead className="text-[10px]">Location</TableHead>
                    <TableHead className="text-[10px]">Age</TableHead>
                    <TableHead className="text-[10px]">Guardian</TableHead>
                    <TableHead className="text-[10px]">Slot</TableHead>
                    <TableHead className="text-[10px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, i) => (
                    <TableRow key={row.id} className={row.errors.length > 0 ? "bg-destructive/5" : row.isDuplicate ? "bg-amber-500/5" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={row.included}
                          disabled={row.errors.length > 0}
                          onCheckedChange={(v) =>
                            setParsedRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, included: !!v } : r))
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-xs">{row.full_name}</TableCell>
                      <TableCell className="text-[10px] font-mono">{row.email}</TableCell>
                      <TableCell className="text-[10px]">{row.phone}</TableCell>
                      <TableCell className="text-[10px]">{row.location}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px]">
                          {getAgeCategoryLabel(row.age_category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px]">{row.guardian_name || "—"}</TableCell>
                      <TableCell className="text-[10px] whitespace-nowrap">
                        {row.start_time && row.end_time
                          ? `${row.start_time.slice(0, 5)}–${row.end_time.slice(0, 5)}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {row.errors.length > 0 ? (
                          <Badge variant="outline" className="text-[9px] border-destructive/50 text-destructive">
                            {row.errors[0]}
                          </Badge>
                        ) : row.warnings.length > 0 ? (
                          <Badge variant="outline" className="text-[9px] border-amber-500/50 text-amber-600">
                            {row.warnings[0]}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] border-secondary/50 text-secondary">
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

        {/* Step 3: Confirm & Import */}
        {step === 3 && (
          <div className="space-y-4">
            {!importDone ? (
              <>
                <div className="text-sm space-y-2">
                  <p>
                    <strong>{validCount}</strong> contestants will be imported as <Badge variant="outline" className="text-[10px] bg-secondary/20 text-secondary">approved</Badge>
                  </p>
                  {subEventId && subEvents && (
                    <p className="text-xs text-muted-foreground">
                      Assigned to: {subEvents.find((s) => s.id === subEventId)?.name}
                    </p>
                  )}
                  {parsedRows.some((r) => r.included && r.start_time) && (
                    <p className="text-xs text-muted-foreground">
                      Performance slots will be created for rows with time data.
                    </p>
                  )}
                </div>

                {importing && (
                  <div className="space-y-2">
                    <Progress value={importProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">{importProgress}%</p>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button size="sm" variant="outline" onClick={() => setStep(2)} disabled={importing}>
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
                <p className="text-xs text-muted-foreground">{validCount} contestants added successfully.</p>
                <Button size="sm" onClick={handleClose}>
                  Done
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
