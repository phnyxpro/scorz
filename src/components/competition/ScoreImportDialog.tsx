import { useState, useMemo, useCallback } from "react";
import { readXLSXToJson } from "@/lib/export-utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, ArrowRight, ArrowLeft, Check, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { FetchedData } from "./ScoreSheetDownloads";

interface ScoreImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subEventId: string;
  subEventName: string;
  fetchedData: FetchedData;
}

interface ParsedRow {
  contestantName: string;
  values: Record<string, number | null>;
  csvTotal: number | null;
}

interface ColumnMapping {
  csvHeader: string;
  criterionId: string | null; // rubric_criteria id
  sortOrder: number | null;
}

interface MatchedRow extends ParsedRow {
  registrationId: string | null;
  matchedName: string | null;
  computedTotal: number;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  // Check if one contains the other
  if (na.includes(nb) || nb.includes(na)) return true;
  // Simple Levenshtein threshold for short strings
  if (Math.abs(na.length - nb.length) > 3) return false;
  let matches = 0;
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length > nb.length ? na : nb;
  for (const ch of shorter) {
    if (longer.includes(ch)) matches++;
  }
  return matches / longer.length > 0.8;
}

function autoMapColumns(
  csvHeaders: string[],
  criteria: FetchedData["criteria"]
): ColumnMapping[] {
  return csvHeaders
    .filter((h) => normalize(h) !== "contestant" && normalize(h) !== "total" && normalize(h) !== "#" && normalize(h) !== "rank")
    .map((header) => {
      const match = criteria.find((c) => normalize(c.name) === normalize(header));
      return {
        csvHeader: header,
        criterionId: match?.id ?? null,
        sortOrder: match?.sort_order ?? null,
      };
    });
}

export function ScoreImportDialog({
  open, onOpenChange, subEventId, subEventName, fetchedData,
}: ScoreImportDialogProps) {
  const [step, setStep] = useState(1);
  const [csvRows, setCsvRows] = useState<ParsedRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [selectedJudgeId, setSelectedJudgeId] = useState<string>("");
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");

  const { criteria, contestants, assignedJudges } = fetchedData;

  // Reset state when closing
  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setStep(1);
      setCsvRows([]);
      setCsvHeaders([]);
      setSelectedJudgeId("");
      setColumnMappings([]);
      setImporting(false);
      setFileName("");
    }
    onOpenChange(o);
  };

  // Step 1: Parse file
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = evt.target?.result as ArrayBuffer;
      const json = await readXLSXToJson<Record<string, any>>(data);
      if (json.length === 0) {
        toast({ title: "Empty file", variant: "destructive" });
        return;
      }

      const headers = Object.keys(json[0]);
      setCsvHeaders(headers);

      const totalHeader = headers.find((h) => normalize(h) === "total");
      const contestantHeader = headers.find((h) => normalize(h) === "contestant") || headers[0];

      const parsed: ParsedRow[] = json.map((row) => {
        const values: Record<string, number | null> = {};
        for (const h of headers) {
          if (normalize(h) === normalize(contestantHeader) || normalize(h) === "total" || normalize(h) === "#" || normalize(h) === "rank") continue;
          const v = row[h];
          values[h] = v === "" || v === null || v === undefined ? null : Number(v);
        }
        return {
          contestantName: String(row[contestantHeader] || "").trim(),
          values,
          csvTotal: totalHeader ? (row[totalHeader] === "" ? null : Number(row[totalHeader])) : null,
        };
      }).filter((r) => r.contestantName.length > 0);

      setCsvRows(parsed);

      // Auto-map columns
      const mappings = autoMapColumns(headers, criteria);
      setColumnMappings(mappings);

      // Try to auto-select judge from filename
      if (assignedJudges.length > 0) {
        const fnLower = file.name.toLowerCase();
        const match = assignedJudges.find((j) => {
          const parts = j.name.toLowerCase().split(" ");
          return parts.some((p) => p.length > 2 && fnLower.includes(p));
        });
        if (match) setSelectedJudgeId(match.user_id);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [criteria, assignedJudges]);

  // Step 2: Update mapping
  const updateMapping = (index: number, criterionId: string) => {
    setColumnMappings((prev) =>
      prev.map((m, i) => {
        if (i !== index) return m;
        const crit = criteria.find((c) => c.id === criterionId);
        return { ...m, criterionId, sortOrder: crit?.sort_order ?? null };
      })
    );
  };

  const mappedCount = columnMappings.filter((m) => m.criterionId).length;

  // Step 3: Match contestants
  const matchedRows: MatchedRow[] = useMemo(() => {
    return csvRows.map((row) => {
      // Try exact case-insensitive first, then fuzzy
      let match = contestants.find((c) => normalize(c.full_name) === normalize(row.contestantName));
      if (!match) {
        match = contestants.find((c) => fuzzyMatch(c.full_name, row.contestantName));
      }

      // Compute total from mapped columns
      let computedTotal = 0;
      for (const mapping of columnMappings) {
        if (mapping.criterionId && row.values[mapping.csvHeader] != null) {
          computedTotal += row.values[mapping.csvHeader]!;
        }
      }
      computedTotal = Math.round(computedTotal * 100) / 100;

      const hasAnyScore = Object.values(row.values).some((v) => v !== null && v !== 0);

      return {
        ...row,
        registrationId: match?.id ?? null,
        matchedName: match?.full_name ?? null,
        computedTotal: hasAnyScore ? computedTotal : 0,
      };
    });
  }, [csvRows, contestants, columnMappings]);

  const importableRows = matchedRows.filter((r) => r.registrationId && Object.values(r.values).some((v) => v !== null && v !== 0));
  const unmatchedRows = matchedRows.filter((r) => !r.registrationId && Object.values(r.values).some((v) => v !== null && v !== 0));

  // Step 4: Import
  const handleImport = async () => {
    if (!selectedJudgeId) return;
    setImporting(true);
    try {
      const upsertRows = importableRows.map((row) => {
        const criterionScores: Record<string, number> = {};
        for (const mapping of columnMappings) {
          if (mapping.criterionId && mapping.sortOrder !== null && row.values[mapping.csvHeader] != null) {
            criterionScores[String(mapping.sortOrder)] = row.values[mapping.csvHeader]!;
          }
        }
        return {
          judge_id: selectedJudgeId,
          sub_event_id: subEventId,
          contestant_registration_id: row.registrationId!,
          criterion_scores: criterionScores,
          raw_total: row.computedTotal,
        };
      });

      // Upsert one by one to handle existing rows (update vs insert)
      let inserted = 0;
      let updated = 0;
      for (const row of upsertRows) {
        // Check if exists
        const { data: existing } = await supabase
          .from("judge_scores")
          .select("id")
          .eq("judge_id", row.judge_id)
          .eq("sub_event_id", row.sub_event_id)
          .eq("contestant_registration_id", row.contestant_registration_id)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from("judge_scores")
            .update({
              criterion_scores: row.criterion_scores,
              raw_total: row.raw_total,
            })
            .eq("id", existing.id);
          if (error) throw error;
          updated++;
        } else {
          const { error } = await supabase
            .from("judge_scores")
            .insert(row);
          if (error) throw error;
          inserted++;
        }
      }

      toast({
        title: "Scores imported",
        description: `${inserted} created, ${updated} updated for ${importableRows.length} contestants.`,
      });
      handleOpenChange(false);
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const canProceedStep1 = csvRows.length > 0 && selectedJudgeId;
  const canProceedStep2 = mappedCount > 0;
  const canProceedStep3 = importableRows.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import Scores — {subEventName}
          </DialogTitle>
          <DialogDescription>
            Step {step} of 4 —{" "}
            {step === 1 && "Upload file & select judge"}
            {step === 2 && "Map columns to rubric criteria"}
            {step === 3 && "Preview & validate matches"}
            {step === 4 && "Confirm import"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: File & Judge */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">CSV or Excel file</label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm border border-border rounded-md p-2 bg-background"
              />
              {fileName && (
                <p className="text-xs text-muted-foreground mt-1">{fileName} — {csvRows.length} rows parsed</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Judge</label>
              <Select value={selectedJudgeId} onValueChange={setSelectedJudgeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select judge…" />
                </SelectTrigger>
                <SelectContent>
                  {assignedJudges.map((j) => (
                    <SelectItem key={j.user_id} value={j.user_id}>{j.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedJudgeId && fileName && (
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-detected from filename? {assignedJudges.find((j) => j.user_id === selectedJudgeId)?.name}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Map each CSV column to a rubric criterion. {mappedCount}/{columnMappings.length} mapped.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CSV Column</TableHead>
                  <TableHead>Rubric Criterion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {columnMappings.map((m, i) => (
                  <TableRow key={m.csvHeader}>
                    <TableCell className="font-medium text-sm">{m.csvHeader}</TableCell>
                    <TableCell>
                      <Select
                        value={m.criterionId ?? "unmapped"}
                        onValueChange={(v) => updateMapping(i, v === "unmapped" ? "" : v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unmapped">— Skip —</SelectItem>
                          {criteria.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} (#{c.sort_order})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="flex gap-3 text-sm">
              <Badge variant="default">{importableRows.length} ready to import</Badge>
              {unmatchedRows.length > 0 && (
                <Badge variant="destructive">{unmatchedRows.length} unmatched (will skip)</Badge>
              )}
              <Badge variant="secondary">
                {matchedRows.filter((r) => !Object.values(r.values).some((v) => v !== null && v !== 0)).length} blank (skipped)
              </Badge>
            </div>
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CSV Name</TableHead>
                    <TableHead>Matched To</TableHead>
                    <TableHead className="text-right">Computed</TableHead>
                    <TableHead className="text-right">CSV Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchedRows
                    .filter((r) => Object.values(r.values).some((v) => v !== null && v !== 0))
                    .map((row, i) => {
                      const totalMatch = row.csvTotal !== null && Math.abs(row.computedTotal - row.csvTotal) < 0.01;
                      return (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{row.contestantName}</TableCell>
                          <TableCell className="text-sm">
                            {row.matchedName ?? <span className="text-destructive">No match</span>}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{row.computedTotal}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {row.csvTotal ?? "—"}
                            {row.csvTotal !== null && !totalMatch && (
                              <AlertTriangle className="inline h-3 w-3 text-destructive ml-1" />
                            )}
                          </TableCell>
                          <TableCell>
                            {row.registrationId ? (
                              <Badge variant="default" className="text-xs">Ready</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">Skip</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="space-y-4 text-center py-4">
            {importing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Importing scores…</p>
              </div>
            ) : (
              <>
                <Check className="h-10 w-10 text-primary mx-auto" />
                <p className="text-lg font-medium">Ready to import</p>
                <p className="text-sm text-muted-foreground">
                  {importableRows.length} scores for judge{" "}
                  <strong>{assignedJudges.find((j) => j.user_id === selectedJudgeId)?.name}</strong>{" "}
                  will be upserted into {subEventName}.
                </p>
                {unmatchedRows.length > 0 && (
                  <p className="text-sm text-destructive">
                    {unmatchedRows.length} rows with scores will be skipped (no contestant match).
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {step > 1 && !importing && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
          </div>
          <div>
            {step === 1 && (
              <Button disabled={!canProceedStep1} onClick={() => setStep(2)}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 2 && (
              <Button disabled={!canProceedStep2} onClick={() => setStep(3)}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button disabled={!canProceedStep3} onClick={() => setStep(4)}>
                Review <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 4 && (
              <Button disabled={importing} onClick={handleImport}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                Import Scores
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
