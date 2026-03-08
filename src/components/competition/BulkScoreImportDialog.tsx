import { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Upload, ArrowRight, ArrowLeft, Check, AlertTriangle, Loader2, X, Files } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { FetchedData } from "./ScoreSheetDownloads";

interface BulkScoreImportDialogProps {
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

interface ParsedFile {
  fileName: string;
  rows: ParsedRow[];
  headers: string[];
  autoDetectedJudgeId: string | null;
  selectedJudgeId: string;
  columnMappings: ColumnMapping[];
  matchedCount: number;
  unmatchedCount: number;
  error?: string;
}

interface ColumnMapping {
  csvHeader: string;
  criterionId: string | null;
  sortOrder: number | null;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
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

function autoDetectJudge(fileName: string, judges: FetchedData["assignedJudges"]): string | null {
  const fnLower = fileName.toLowerCase();
  const match = judges.find((j) => {
    const parts = j.name.toLowerCase().split(" ");
    return parts.some((p) => p.length > 2 && fnLower.includes(p));
  });
  return match?.user_id ?? null;
}

function parseFile(
  file: File,
  criteria: FetchedData["criteria"],
  judges: FetchedData["assignedJudges"],
  contestants: FetchedData["contestants"]
): Promise<ParsedFile> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

        if (json.length === 0) {
          resolve({
            fileName: file.name, rows: [], headers: [],
            autoDetectedJudgeId: null, selectedJudgeId: "",
            columnMappings: [], matchedCount: 0, unmatchedCount: 0,
            error: "Empty file",
          });
          return;
        }

        const headers = Object.keys(json[0]);
        const totalHeader = headers.find((h) => normalize(h) === "total");
        const contestantHeader = headers.find((h) => normalize(h) === "contestant") || headers[0];

        const rows: ParsedRow[] = json.map((row) => {
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

        const mappings = autoMapColumns(headers, criteria);
        const detectedJudgeId = autoDetectJudge(file.name, judges);

        // Count matches
        let matched = 0, unmatched = 0;
        for (const row of rows) {
          const hasScores = Object.values(row.values).some((v) => v !== null && v !== 0);
          if (!hasScores) continue;
          const m = contestants.find((c) => normalize(c.full_name) === normalize(row.contestantName))
            || contestants.find((c) => fuzzyMatch(c.full_name, row.contestantName));
          if (m) matched++; else unmatched++;
        }

        resolve({
          fileName: file.name, rows, headers,
          autoDetectedJudgeId: detectedJudgeId,
          selectedJudgeId: detectedJudgeId || "",
          columnMappings: mappings,
          matchedCount: matched,
          unmatchedCount: unmatched,
        });
      } catch (err: any) {
        resolve({
          fileName: file.name, rows: [], headers: [],
          autoDetectedJudgeId: null, selectedJudgeId: "",
          columnMappings: [], matchedCount: 0, unmatchedCount: 0,
          error: err.message,
        });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export function BulkScoreImportDialog({
  open, onOpenChange, subEventId, subEventName, fetchedData,
}: BulkScoreImportDialogProps) {
  const [step, setStep] = useState(1);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, currentFile: "" });
  const [importResults, setImportResults] = useState<{ fileName: string; inserted: number; updated: number; error?: string }[]>([]);

  const { criteria, contestants, assignedJudges } = fetchedData;

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setStep(1);
      setParsedFiles([]);
      setImporting(false);
      setImportProgress({ current: 0, total: 0, currentFile: "" });
      setImportResults([]);
    }
    onOpenChange(o);
  };

  const handleFilesChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const results = await Promise.all(
      files.map((f) => parseFile(f, criteria, assignedJudges, contestants))
    );
    setParsedFiles(results);
  }, [criteria, assignedJudges, contestants]);

  const updateJudge = (index: number, judgeId: string) => {
    setParsedFiles((prev) =>
      prev.map((f, i) => i === index ? { ...f, selectedJudgeId: judgeId } : f)
    );
  };

  const removeFile = (index: number) => {
    setParsedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validFiles = parsedFiles.filter((f) => !f.error && f.rows.length > 0 && f.selectedJudgeId);
  const allMapped = validFiles.every((f) => f.columnMappings.some((m) => m.criterionId));

  // Check for duplicate judge assignments
  const judgeAssignments = validFiles.map((f) => f.selectedJudgeId);
  const hasDuplicateJudges = new Set(judgeAssignments).size !== judgeAssignments.length;

  const handleImport = async () => {
    setImporting(true);
    setImportProgress({ current: 0, total: validFiles.length, currentFile: "" });
    const results: typeof importResults = [];

    for (let fi = 0; fi < validFiles.length; fi++) {
      const pf = validFiles[fi];
      setImportProgress({ current: fi + 1, total: validFiles.length, currentFile: pf.fileName });

      try {
        let inserted = 0, updated = 0;

        for (const row of pf.rows) {
          const hasScores = Object.values(row.values).some((v) => v !== null && v !== 0);
          if (!hasScores) continue;

          const match = contestants.find((c) => normalize(c.full_name) === normalize(row.contestantName))
            || contestants.find((c) => fuzzyMatch(c.full_name, row.contestantName));
          if (!match) continue;

          const criterionScores: Record<string, number> = {};
          let rawTotal = 0;
          for (const mapping of pf.columnMappings) {
            if (mapping.criterionId && mapping.sortOrder !== null && row.values[mapping.csvHeader] != null) {
              criterionScores[String(mapping.sortOrder)] = row.values[mapping.csvHeader]!;
              rawTotal += row.values[mapping.csvHeader]!;
            }
          }
          rawTotal = Math.round(rawTotal * 100) / 100;

          const { data: existing } = await supabase
            .from("judge_scores")
            .select("id")
            .eq("judge_id", pf.selectedJudgeId)
            .eq("sub_event_id", subEventId)
            .eq("contestant_registration_id", match.id)
            .maybeSingle();

          if (existing) {
            const { error } = await supabase
              .from("judge_scores")
              .update({ criterion_scores: criterionScores, raw_total: rawTotal })
              .eq("id", existing.id);
            if (error) throw error;
            updated++;
          } else {
            const { error } = await supabase
              .from("judge_scores")
              .insert({
                judge_id: pf.selectedJudgeId,
                sub_event_id: subEventId,
                contestant_registration_id: match.id,
                criterion_scores: criterionScores,
                raw_total: rawTotal,
              });
            if (error) throw error;
            inserted++;
          }
        }

        results.push({ fileName: pf.fileName, inserted, updated });
      } catch (err: any) {
        results.push({ fileName: pf.fileName, inserted: 0, updated: 0, error: err.message });
      }
    }

    setImportResults(results);
    setImporting(false);
    setStep(3);
  };

  const totalInserted = importResults.reduce((s, r) => s + r.inserted, 0);
  const totalUpdated = importResults.reduce((s, r) => s + r.updated, 0);
  const totalErrors = importResults.filter((r) => r.error).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Files className="h-5 w-5 text-primary" />
            Bulk Import Scores — {subEventName}
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3 —{" "}
            {step === 1 && "Upload files & assign judges"}
            {step === 2 && "Importing scores…"}
            {step === 3 && "Import complete"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload & Assign */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select multiple CSV/Excel files (one per judge)</label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                multiple
                onChange={handleFilesChange}
                className="block w-full text-sm border border-border rounded-md p-2 bg-background"
              />
            </div>

            {parsedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{parsedFiles.length} file(s) loaded</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Matched</TableHead>
                      <TableHead>Columns Mapped</TableHead>
                      <TableHead>Judge</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedFiles.map((pf, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm font-medium max-w-[200px] truncate">
                          {pf.fileName}
                          {pf.error && (
                            <Badge variant="destructive" className="ml-2 text-xs">{pf.error}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{pf.rows.length}</TableCell>
                        <TableCell className="text-sm">
                          <span className="text-primary">{pf.matchedCount}</span>
                          {pf.unmatchedCount > 0 && (
                            <span className="text-destructive ml-1">({pf.unmatchedCount} unmatched)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {pf.columnMappings.filter((m) => m.criterionId).length}/{pf.columnMappings.length}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={pf.selectedJudgeId || "unassigned"}
                            onValueChange={(v) => updateJudge(i, v === "unassigned" ? "" : v)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select judge…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">— Select judge —</SelectItem>
                              {assignedJudges.map((j) => (
                                <SelectItem key={j.user_id} value={j.user_id}>{j.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {pf.autoDetectedJudgeId && (
                            <p className="text-xs text-muted-foreground mt-0.5">Auto-detected</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeFile(i)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {hasDuplicateJudges && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Multiple files are assigned to the same judge. Each file should be for a different judge.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Importing */}
        {step === 2 && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">
                Importing file {importProgress.current} of {importProgress.total}
              </p>
              <p className="text-xs text-muted-foreground truncate max-w-md">{importProgress.currentFile}</p>
              <Progress
                value={importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}
                className="w-full max-w-md"
              />
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex gap-3 text-sm flex-wrap">
              <Badge variant="default">{totalInserted} created</Badge>
              <Badge variant="secondary">{totalUpdated} updated</Badge>
              {totalErrors > 0 && <Badge variant="destructive">{totalErrors} failed</Badge>}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Judge</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importResults.map((r, i) => {
                  const judge = assignedJudges.find((j) => j.user_id === validFiles[i]?.selectedJudgeId);
                  return (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium max-w-[200px] truncate">{r.fileName}</TableCell>
                      <TableCell className="text-sm">{judge?.name ?? "—"}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{r.inserted}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{r.updated}</TableCell>
                      <TableCell>
                        {r.error ? (
                          <Badge variant="destructive" className="text-xs">{r.error}</Badge>
                        ) : (
                          <Badge variant="default" className="text-xs">
                            <Check className="h-3 w-3 mr-1" /> Done
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {step === 3 && (
              <Button variant="outline" onClick={() => { setStep(1); setImportResults([]); setParsedFiles([]); }}>
                Import More
              </Button>
            )}
          </div>
          <div>
            {step === 1 && (
              <Button
                disabled={validFiles.length === 0 || !allMapped || hasDuplicateJudges}
                onClick={() => { setStep(2); handleImport(); }}
              >
                Import {validFiles.length} file(s) <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button onClick={() => handleOpenChange(false)}>
                <Check className="h-4 w-4 mr-1" /> Done
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
