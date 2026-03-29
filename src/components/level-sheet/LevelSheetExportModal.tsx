import { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileText, FileSpreadsheet, Sheet, Printer } from "lucide-react";
import { exportCSV, exportXLSX, exportGoogleSheets, exportElementAsPDF, type SheetRow } from "@/lib/export-utils";
import { format } from "date-fns";

interface CertInfo {
  name: string;
  role: string;
  certified: boolean;
  signedAt?: string | null;
}

interface LevelSheetExportModalProps {
  competitionName: string;
  competitionLogo?: string | null;
  primaryColor: string;
  accentColor: string;
  levelName: string;
  isFinalRound: boolean;
  advancementCount: number | null;
  subEventCount: number;
  rows: {
    name: string;
    subEvent: string;
    judgeScores: Record<string, { rawTotal: number; certified: boolean }>;
    allJudgesRawTotal: number;
    timePenalty: number;
    avgFinal: number;
  }[];
  judgeIds: string[];
  judgeNames: Map<string, string>;
  certifications: CertInfo[];
}

type ColumnKey = "rank" | "contestant" | "subEvent" | "judges" | "total" | "penalty" | "finalScore" | "status";

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "rank", label: "#" },
  { key: "contestant", label: "Contestant" },
  { key: "subEvent", label: "Sub-Event" },
  { key: "judges", label: "Judge Scores" },
  { key: "total", label: "All Judges Total" },
  { key: "penalty", label: "Penalty" },
  { key: "finalScore", label: "Final Score" },
  { key: "status", label: "Status / Badges" },
];

export function LevelSheetExportModal({
  competitionName,
  competitionLogo,
  primaryColor,
  accentColor,
  levelName,
  isFinalRound,
  advancementCount,
  subEventCount,
  rows,
  judgeIds,
  judgeNames,
  certifications,
}: LevelSheetExportModalProps) {
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [includeStyling, setIncludeStyling] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState<Set<ColumnKey>>(
    new Set(COLUMNS.map((c) => c.key))
  );
  const pdfRef = useRef<HTMLDivElement>(null);

  const toggleColumn = (key: ColumnKey) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const has = (key: ColumnKey) => selectedColumns.has(key);

  const getStatusText = (i: number) => {
    if (isFinalRound) {
      if (i === 0) return "🥇 Champion";
      if (i === 1) return "🥈 2nd Place";
      if (i === 2) return "🥉 3rd Place";
      return "";
    }
    if (advancementCount == null) return "";
    if (i < advancementCount) return "✓ Advances";
    if (i === advancementCount || i === advancementCount + 1) return "Standby";
    return "";
  };

  const getRowBg = (i: number) => {
    if (!includeStyling) return i % 2 === 0 ? "#fff" : "#f8f8f8";
    if (isFinalRound && i < 3) return "#fef3c7";
    if (!isFinalRound && advancementCount != null) {
      if (i < advancementCount) return "#dcfce7";
      if (i === advancementCount || i === advancementCount + 1) return "#fef3c7";
    }
    return i % 2 === 0 ? "#fff" : "#f8f8f8";
  };

  const buildExportRows = (): SheetRow[] => {
    return rows.map((r, i) => {
      const row: SheetRow = {};
      if (has("rank")) row["Rank"] = i + 1;
      if (has("contestant")) row["Contestant"] = r.name;
      if (has("subEvent")) row["Sub-Event"] = r.subEvent;
      if (has("judges")) {
        for (const jId of judgeIds) {
          const js = r.judgeScores[jId];
          row[judgeNames.get(jId) || "Judge"] = js ? Number(js.rawTotal.toFixed(2)) : 0;
        }
      }
      if (has("total")) row["All Judges Total"] = Number(r.allJudgesRawTotal.toFixed(2));
      if (has("penalty")) row["Penalty"] = Number(r.timePenalty.toFixed(2));
      if (has("finalScore")) row["Final Score"] = Number(r.avgFinal.toFixed(2));
      if (has("status")) {
        const status = getStatusText(i);
        if (status) row["Status"] = status;
        else row["Status"] = "";
      }
      return row;
    });
  };

  const filename = `level-sheet-${levelName}`.replace(/\s+/g, "-").toLowerCase();

  const handlePdfExport = async () => {
    if (!pdfRef.current) return;
    setIsExporting(true);
    try {
      await exportElementAsPDF(pdfRef.current, filename, { format: "letter", orientation: "landscape", margin: 0 });
    } finally {
      setIsExporting(false);
    }
  };

  const certifiedList = certifications.filter((c) => c.certified);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 print:hidden">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export Level Master Sheet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls row */}
          <div className="flex flex-wrap gap-4">
            {/* Column selection */}
            <div className="space-y-2 flex-1 min-w-[200px]">
              <p className="text-sm font-medium text-foreground">Columns to include</p>
              <div className="grid grid-cols-2 gap-1.5">
                {COLUMNS.map((col) => (
                  <div key={col.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`col-${col.key}`}
                      checked={selectedColumns.has(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                    />
                    <Label htmlFor={`col-${col.key}`} className="text-xs cursor-pointer">
                      {col.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Styling toggle */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Options</p>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-styling"
                  checked={includeStyling}
                  onCheckedChange={(v) => setIncludeStyling(!!v)}
                />
                <Label htmlFor="include-styling" className="text-xs cursor-pointer">
                  Include status colours & badges
                </Label>
              </div>
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" onClick={handlePdfExport} disabled={isExporting || rows.length === 0}>
              <Printer className="h-4 w-4 mr-1.5" />
              {isExporting ? "Exporting…" : "PDF (Branded)"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportGoogleSheets(buildExportRows(), filename)} disabled={rows.length === 0}>
              <Sheet className="h-4 w-4 mr-1.5" />
              Google Sheets
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportXLSX(buildExportRows(), filename, "Level Sheet")} disabled={rows.length === 0}>
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              Excel
            </Button>
          </div>

          {/* Preview */}
          <div className="border border-border rounded-lg overflow-hidden">
            <p className="text-xs text-muted-foreground px-3 py-1.5 bg-muted/50">Preview</p>
            <div className="overflow-x-auto bg-white">
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
                {/* Banner header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "10px",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                    color: "#fff",
                  }}
                >
                  {competitionLogo && (
                    <img
                      src={competitionLogo}
                      crossOrigin="anonymous"
                      style={{ height: "44px", width: "auto", objectFit: "contain", borderRadius: "4px" }}
                      alt=""
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "16px", fontWeight: 700 }}>{competitionName}</div>
                    <div style={{ fontSize: "10px", opacity: 0.85 }}>
                      Level: {levelName} • {subEventCount} sub-event{subEventCount !== 1 ? "s" : ""} combined
                      {isFinalRound && " • Final Round"}
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: accentColor,
                      color: "#fff",
                      fontSize: "8px",
                      padding: "3px 10px",
                      borderRadius: "4px",
                      fontWeight: 700,
                      letterSpacing: "0.5px",
                    }}
                  >
                    LEVEL MASTER SHEET
                  </div>
                </div>

                {/* Score table */}
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8px" }}>
                    <thead>
                      <tr style={{ backgroundColor: primaryColor, color: "#fff" }}>
                        {has("rank") && <th style={thStyle}>#</th>}
                        {has("contestant") && <th style={{ ...thStyle, textAlign: "left" }}>Contestant</th>}
                        {has("subEvent") && <th style={{ ...thStyle, textAlign: "left" }}>Sub-Event</th>}
                        {has("judges") &&
                          judgeIds.map((jId) => (
                            <th key={jId} style={{ ...thStyle, textAlign: "center" }}>
                              {judgeNames.get(jId) || "Judge"}
                            </th>
                          ))}
                        {has("total") && <th style={{ ...thStyle, textAlign: "center" }}>Total</th>}
                        {has("penalty") && <th style={{ ...thStyle, textAlign: "center" }}>Penalty</th>}
                        {has("finalScore") && <th style={{ ...thStyle, textAlign: "center" }}>Final</th>}
                        {has("status") && <th style={{ ...thStyle, textAlign: "center" }}>Status</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} style={{ backgroundColor: getRowBg(i), borderBottom: "1px solid #e5e5e5" }}>
                          {has("rank") && <td style={{ ...tdStyle, fontWeight: 600 }}>{i + 1}</td>}
                          {has("contestant") && <td style={tdStyle}>{r.name}</td>}
                          {has("subEvent") && <td style={{ ...tdStyle, fontSize: "7px" }}>{r.subEvent}</td>}
                          {has("judges") &&
                            judgeIds.map((jId) => {
                              const js = r.judgeScores[jId];
                              return (
                                <td key={jId} style={{ ...tdStyle, textAlign: "center", fontFamily: "monospace" }}>
                                  {js ? js.rawTotal.toFixed(2) : "—"}
                                </td>
                              );
                            })}
                          {has("total") && (
                            <td style={{ ...tdStyle, textAlign: "center", fontFamily: "monospace", fontWeight: 600 }}>
                              {r.allJudgesRawTotal.toFixed(2)}
                            </td>
                          )}
                          {has("penalty") && (
                            <td style={{ ...tdStyle, textAlign: "center", fontFamily: "monospace", color: r.timePenalty > 0 ? "#dc2626" : "#999" }}>
                              {r.timePenalty > 0 ? `-${r.timePenalty.toFixed(2)}` : "0.00"}
                            </td>
                          )}
                          {has("finalScore") && (
                            <td style={{ ...tdStyle, textAlign: "center", fontFamily: "monospace", fontWeight: 700, color: primaryColor }}>
                              {r.avgFinal.toFixed(2)}
                            </td>
                          )}
                          {has("status") && (
                            <td style={{ ...tdStyle, textAlign: "center", fontSize: "7px", fontWeight: 600 }}>
                              {includeStyling ? getStatusText(i) : ""}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: "8px",
                    borderTop: "1px solid #e5e5e5",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    fontSize: "7px",
                    color: "#888",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "9px", color: "#555", marginBottom: "2px" }}>scorz.live</div>
                    {certifiedList.length > 0 && (
                      <div>
                        <strong>Certified by:</strong>{" "}
                        {certifiedList.map((c) => `${c.name} (${c.role})`).join(" • ")}
                      </div>
                    )}
                  </div>
                  <span>Generated {format(new Date(), "MMM d, yyyy h:mm a")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const thStyle: React.CSSProperties = { padding: "3px 4px", fontWeight: 600, fontSize: "8px" };
const tdStyle: React.CSSProperties = { padding: "2px 4px", fontSize: "8px" };
