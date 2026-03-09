import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Download, FileText, FileSpreadsheet, Sheet, Printer, ChevronDown, ChevronRight, User } from "lucide-react";
import { exportCSV, exportXLSX, exportGoogleSheets, exportElementAsPDF, type SheetRow } from "@/lib/export-utils";
import type { JudgeScore } from "@/hooks/useJudgeScores";

interface Props {
  subEventId: string;
  subEventName: string;
  competitionName: string;
  scores: JudgeScore[];
  registrations: { id: string; full_name: string; sub_event_id: string | null }[];
  rubric: { id: string; name: string; sort_order: number }[];
  judgeProfiles: Record<string, string>;
  indexToName: Record<string, string>;
}

export function JudgeScoreSheets({
  subEventId,
  subEventName,
  competitionName,
  scores,
  registrations,
  rubric,
  judgeProfiles,
  indexToName,
}: Props) {
  const [openJudgeId, setOpenJudgeId] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const seScores = useMemo(() => scores.filter((s) => s.sub_event_id === subEventId), [scores, subEventId]);
  const seContestants = useMemo(
    () => registrations.filter((r) => r.sub_event_id === subEventId),
    [registrations, subEventId]
  );
  const rubricSorted = useMemo(() => [...rubric].sort((a, b) => a.sort_order - b.sort_order), [rubric]);
  const rubricNames = useMemo(() => rubricSorted.map((r) => r.name), [rubricSorted]);

  const judgeIds = useMemo(() => [...new Set(seScores.map((s) => s.judge_id))], [seScores]);

  if (judgeIds.length === 0) return null;

  const getJudgeRows = (judgeId: string) => {
    const judgeScores = seScores.filter((s) => s.judge_id === judgeId);
    return seContestants.map((reg) => {
      const score = judgeScores.find((s) => s.contestant_registration_id === reg.id);
      const criterionValues: Record<string, number | null> = {};
      if (score) {
        const cs = score.criterion_scores as Record<string, number>;
        for (const [k, v] of Object.entries(cs)) {
          const name = indexToName[k] ?? k;
          criterionValues[name] = v;
        }
      }
      return {
        contestant: reg.full_name,
        criterionValues,
        rawTotal: score?.raw_total ?? 0,
        timePenalty: score?.time_penalty ?? 0,
        finalScore: score?.final_score ?? 0,
        hasScore: !!score,
      };
    });
  };

  const buildExportRows = (judgeId: string): SheetRow[] => {
    const rows = getJudgeRows(judgeId);
    return rows.map((r) => {
      const row: SheetRow = { Contestant: r.contestant };
      for (const name of rubricNames) {
        row[name] = r.criterionValues[name] != null ? Number(Number(r.criterionValues[name]).toFixed(2)) : 0;
      }
      row["Raw Total"] = Number(r.rawTotal.toFixed(2));
      row["Penalty"] = Number(r.timePenalty.toFixed(2));
      row["Final Score"] = Number(r.finalScore.toFixed(2));
      return row;
    });
  };

  const handlePdfExport = async (judgeId: string) => {
    if (!pdfRef.current) return;
    setOpenJudgeId(judgeId);
    setIsExporting(true);
    // Allow DOM to render the PDF element
    await new Promise((r) => setTimeout(r, 100));
    try {
      const judgeName = judgeProfiles[judgeId] || "Judge";
      const filename = `judge-sheet-${judgeName}-${subEventName}`.replace(/\s+/g, "-").toLowerCase();
      await exportElementAsPDF(pdfRef.current, filename, { format: "letter", orientation: "landscape", margin: 0 });
    } finally {
      setIsExporting(false);
    }
  };

  const activeJudgeId = openJudgeId || judgeIds[0];
  const activeRows = getJudgeRows(activeJudgeId);
  const activeJudgeName = judgeProfiles[activeJudgeId] || "Judge";

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        Judge Sheets ({judgeIds.length})
      </p>
      {judgeIds.map((judgeId) => {
        const judgeName = judgeProfiles[judgeId] || judgeId.slice(0, 8);
        const isOpen = openJudgeId === judgeId;
        const rows = getJudgeRows(judgeId);
        const filename = `judge-sheet-${judgeName}-${subEventName}`.replace(/\s+/g, "-").toLowerCase();
        const exportRows = buildExportRows(judgeId);

        return (
          <Collapsible key={judgeId} open={isOpen} onOpenChange={(o) => setOpenJudgeId(o ? judgeId : null)}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs h-8">
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <User className="h-3.5 w-3.5 text-primary" />
                {judgeName}
                <span className="text-muted-foreground ml-auto font-mono">
                  {rows.filter((r) => r.hasScore).length}/{rows.length} scored
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pl-2 pr-1 pb-2">
              {/* Score Table */}
              <div className="overflow-x-auto border border-border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Contestant</TableHead>
                      {rubricNames.map((n) => (
                        <TableHead key={n} className="text-center text-xs">{n}</TableHead>
                      ))}
                      <TableHead className="text-center text-xs">Raw</TableHead>
                      <TableHead className="text-center text-xs">Penalty</TableHead>
                      <TableHead className="text-center text-xs font-bold">Final</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{r.contestant}</TableCell>
                        {rubricNames.map((n) => (
                          <TableCell key={n} className="text-center font-mono text-xs">
                            {r.criterionValues[n] != null ? Number(r.criterionValues[n]).toFixed(2) : "—"}
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-mono text-xs">{r.hasScore ? r.rawTotal.toFixed(2) : "—"}</TableCell>
                        <TableCell className="text-center font-mono text-xs text-destructive">
                          {r.timePenalty > 0 ? `-${r.timePenalty}` : "0"}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-xs">
                          {r.hasScore ? r.finalScore.toFixed(2) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Export buttons */}
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => handlePdfExport(judgeId)}
                  disabled={isExporting || exportRows.length === 0}
                >
                  <Printer className="h-3 w-3" />
                  {isExporting && openJudgeId === judgeId ? "Exporting…" : "PDF"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => exportGoogleSheets(exportRows, filename)}
                  disabled={exportRows.length === 0}
                >
                  <Sheet className="h-3 w-3" /> Sheets
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => exportXLSX(exportRows, filename, judgeName)}
                  disabled={exportRows.length === 0}
                >
                  <FileSpreadsheet className="h-3 w-3" /> Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => exportCSV(exportRows, filename)}
                  disabled={exportRows.length === 0}
                >
                  <FileText className="h-3 w-3" /> CSV
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Hidden branded PDF element */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div
          ref={pdfRef}
          style={{
            width: "11in",
            minHeight: "8.5in",
            padding: "0.35in 0.4in",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: "9px",
            color: "#1a1a1a",
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px", padding: "10px 14px", borderRadius: "6px", background: "linear-gradient(135deg, #1a1a2e, #1a1a2edd)", color: "#fff" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "16px", fontWeight: 700 }}>{competitionName}</div>
              <div style={{ fontSize: "10px", opacity: 0.85 }}>
                Judge: {activeJudgeName} • Sub-Event: {subEventName}
              </div>
            </div>
            <div style={{ backgroundColor: "#e94560", color: "#fff", fontSize: "8px", padding: "3px 10px", borderRadius: "4px", fontWeight: 700, letterSpacing: "0.5px" }}>
              JUDGE SCORE SHEET
            </div>
          </div>

          {/* Score table */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8px" }}>
              <thead>
                <tr style={{ backgroundColor: "#1a1a2e", color: "#fff" }}>
                  <th style={{ padding: "3px 4px", textAlign: "left", fontWeight: 600 }}>Contestant</th>
                  {rubricNames.map((n) => (
                    <th key={n} style={{ padding: "3px 4px", textAlign: "center", fontWeight: 600 }}>{n}</th>
                  ))}
                  <th style={{ padding: "3px 4px", textAlign: "center", fontWeight: 600 }}>Raw Total</th>
                  <th style={{ padding: "3px 4px", textAlign: "center", fontWeight: 600 }}>Penalty</th>
                  <th style={{ padding: "3px 4px", textAlign: "center", fontWeight: 600 }}>Final</th>
                </tr>
              </thead>
              <tbody>
                {activeRows.map((r, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f8f8f8", borderBottom: "1px solid #e5e5e5" }}>
                    <td style={{ padding: "2px 4px" }}>{r.contestant}</td>
                    {rubricNames.map((n) => (
                      <td key={n} style={{ padding: "2px 4px", textAlign: "center", fontFamily: "monospace" }}>
                        {r.criterionValues[n] != null ? Number(r.criterionValues[n]).toFixed(2) : "—"}
                      </td>
                    ))}
                    <td style={{ padding: "2px 4px", textAlign: "center", fontFamily: "monospace", fontWeight: 600 }}>
                      {r.hasScore ? r.rawTotal.toFixed(2) : "—"}
                    </td>
                    <td style={{ padding: "2px 4px", textAlign: "center", fontFamily: "monospace", color: r.timePenalty > 0 ? "#dc2626" : "#999" }}>
                      {r.timePenalty > 0 ? `-${r.timePenalty.toFixed(2)}` : "0.00"}
                    </td>
                    <td style={{ padding: "2px 4px", textAlign: "center", fontFamily: "monospace", fontWeight: 700, color: "#1a1a2e" }}>
                      {r.hasScore ? r.finalScore.toFixed(2) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ marginTop: "auto", paddingTop: "6px", borderTop: "1px solid #e5e5e5", display: "flex", justifyContent: "space-between", fontSize: "7px", color: "#999", fontFamily: "monospace" }}>
            <span>@ 2026 SCORZ | Powered by phnyx.dev</span>
            <span>Generated {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
