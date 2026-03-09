import React, { useRef, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Download, FileText, FileSpreadsheet, Sheet, Printer, ClipboardList } from "lucide-react";
import { exportCSV, exportXLSX, exportGoogleSheets, exportElementAsPDF, type SheetRow } from "@/lib/export-utils";
import { calculateMethodScore } from "@/lib/scoring-methods";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaffDisplayNames } from "@/hooks/useStaffDisplayNames";
import { format } from "date-fns";
import type { JudgeScore } from "@/hooks/useJudgeScores";

interface MasterSheetExporterProps {
  competitionId: string;
  subEventId: string;
  allScores: JudgeScore[] | undefined;
  registrations: any[];
  judgeProfiles: Record<string, string>;
  chiefCert: any;
  tabCert: any;
  witnessCert: any;
}

export function MasterSheetExporter({
  competitionId,
  subEventId,
  allScores,
  registrations,
  judgeProfiles,
  chiefCert,
  tabCert,
  witnessCert,
}: MasterSheetExporterProps) {
  const [sheetType, setSheetType] = useState<string>("sub-event");
  const [isExporting, setIsExporting] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  // Fetch competition branding + scoring method
  const { data: competition } = useQuery({
    queryKey: ["comp_branding", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const { data } = await supabase
        .from("competitions")
        .select("name, scoring_method, branding_logo_url, branding_primary_color, branding_accent_color")
        .eq("id", competitionId)
        .single();
      return data;
    },
  });

  // Fetch sub-event + level info
  const { data: subEvent } = useQuery({
    queryKey: ["sub_event_info", subEventId],
    enabled: !!subEventId,
    queryFn: async () => {
      const { data } = await supabase
        .from("sub_events")
        .select("*, competition_levels(id, name, advancement_count)")
        .eq("id", subEventId)
        .single();
      return data;
    },
  });

  // Level master sheet data (all sub-events in level)
  const levelId = (subEvent as any)?.level_id;
  const { data: levelData } = useQuery({
    queryKey: ["level_export_data", competitionId, levelId],
    enabled: !!competitionId && !!levelId && sheetType === "level",
    queryFn: async () => {
      const { data: subEvents } = await supabase
        .from("sub_events")
        .select("id, name")
        .eq("level_id", levelId!)
        .order("event_date");
      const subEventIds = (subEvents || []).map((se) => se.id);
      if (!subEventIds.length) return { subEvents: [], registrations: [], scores: [] };
      const { data: regs } = await supabase
        .from("contestant_registrations")
        .select("id, full_name, user_id, sub_event_id")
        .eq("competition_id", competitionId)
        .in("sub_event_id", subEventIds)
        .eq("status", "approved");
      const { data: scores } = await supabase
        .from("judge_scores")
        .select("*")
        .in("sub_event_id", subEventIds);
      return { subEvents: subEvents || [], registrations: regs || [], scores: (scores || []) as JudgeScore[] };
    },
  });

  // Certification display names
  const chiefJudgeId = chiefCert?.chief_judge_id;
  const tabulatorId = tabCert?.tabulator_id;
  const witnessId = witnessCert?.witness_id;
  const certUserIds = useMemo(() => [chiefJudgeId, tabulatorId, witnessId].filter(Boolean), [chiefJudgeId, tabulatorId, witnessId]);
  const certNameMap = useStaffDisplayNames(certUserIds);

  const scoringMethod = competition?.scoring_method || "olympic";
  const advancementCount = (subEvent as any)?.competition_levels?.advancement_count ?? null;
  const levelName = (subEvent as any)?.competition_levels?.name ?? "";

  // Judge IDs
  const judgeIds = useMemo(() => Object.keys(judgeProfiles), [judgeProfiles]);

  // Build sub-event rows
  const subEventRows = useMemo(() => {
    if (!allScores) return [];
    const seContestants = registrations.filter((r) => r.sub_event_id === subEventId && r.status !== "rejected");
    return seContestants
      .map((reg) => {
        const regScores = allScores.filter((s) => s.contestant_registration_id === reg.id);
        const judgeScoreMap: Record<string, number> = {};
        for (const s of regScores) judgeScoreMap[s.judge_id] = s.raw_total;
        const certifiedScores = regScores.filter((s) => s.is_certified);
        const rawTotals = certifiedScores.map((s) => s.raw_total);
        const timePenalty = certifiedScores.length > 0 ? Math.max(...certifiedScores.map((s) => s.time_penalty)) : 0;
        const allJudgesTotal = rawTotals.reduce((a, b) => a + b, 0);
        const finalScore = certifiedScores.length > 0 ? calculateMethodScore(scoringMethod, rawTotals, timePenalty) : 0;
        return { name: reg.full_name, judgeScoreMap, allJudgesTotal, timePenalty, finalScore };
      })
      .sort((a, b) => b.finalScore - a.finalScore || b.allJudgesTotal - a.allJudgesTotal);
  }, [allScores, registrations, subEventId, scoringMethod]);

  // Build level rows
  const levelRows = useMemo(() => {
    if (!levelData || sheetType !== "level") return [];
    const subEventMap = new Map(levelData.subEvents.map((se) => [se.id, se.name]));
    return levelData.registrations
      .map((reg) => {
        const regScores = levelData.scores.filter((s) => s.contestant_registration_id === reg.id);
        const judgeScoreMap: Record<string, number> = {};
        for (const s of regScores) judgeScoreMap[s.judge_id] = s.raw_total;
        const certifiedScores = regScores.filter((s) => s.is_certified);
        const rawTotals = certifiedScores.map((s) => s.raw_total);
        const timePenalty = certifiedScores.length > 0 ? Math.max(...certifiedScores.map((s) => s.time_penalty)) : 0;
        const allJudgesTotal = rawTotals.reduce((a, b) => a + b, 0);
        const finalScore = certifiedScores.length > 0 ? calculateMethodScore(scoringMethod, rawTotals, timePenalty) : 0;
        return { name: reg.full_name, subEvent: subEventMap.get(reg.sub_event_id || "") || "—", judgeScoreMap, allJudgesTotal, timePenalty, finalScore };
      })
      .sort((a, b) => b.finalScore - a.finalScore || b.allJudgesTotal - a.allJudgesTotal);
  }, [levelData, sheetType, scoringMethod]);

  // Level judge IDs
  const levelJudgeIds = useMemo(() => {
    if (!levelData) return [];
    return [...new Set(levelData.scores.map((s) => s.judge_id))];
  }, [levelData]);
  const levelJudgeNameMap = useStaffDisplayNames(levelJudgeIds);

  const activeRows = sheetType === "level" ? levelRows : subEventRows;
  const activeJudgeIds = sheetType === "level" ? levelJudgeIds : judgeIds;
  const activeJudgeNames = sheetType === "level" ? levelJudgeNameMap : new Map(judgeIds.map((id) => [id, judgeProfiles[id]]));
  const activeAdvCount = sheetType === "level" ? (levelData ? advancementCount : null) : advancementCount;

  // Export rows for CSV/XLSX
  const buildExportRows = (): SheetRow[] => {
    return activeRows.map((r, i) => {
      const row: SheetRow = { Rank: i + 1, Contestant: r.name };
      if (sheetType === "level" && "subEvent" in r) row["Sub-Event"] = (r as any).subEvent;
      for (const jId of activeJudgeIds) {
        row[activeJudgeNames.get(jId) || "Judge"] = r.judgeScoreMap[jId] ? Number(r.judgeScoreMap[jId].toFixed(2)) : 0;
      }
      row["All Judges Total"] = Number(r.allJudgesTotal.toFixed(2));
      row["Penalty"] = Number(r.timePenalty.toFixed(2));
      row["Final Score"] = Number(r.finalScore.toFixed(2));
      if (activeAdvCount != null) row["Advances"] = i < activeAdvCount ? "Yes" : "";
      return row;
    });
  };

  const sheetLabel = sheetType === "level" ? `Level: ${levelName}` : `Sub-Event: ${subEvent?.name || ""}`;
  const filename = sheetType === "level"
    ? `level-master-sheet-${levelName}`.replace(/\s+/g, "-").toLowerCase()
    : `sub-event-master-sheet-${subEvent?.name || "export"}`.replace(/\s+/g, "-").toLowerCase();

  const formatCertDate = (cert: any, field: string = "signed_at") => {
    if (!cert?.[field]) return "Pending";
    return format(new Date(cert[field]), "MMM d, yyyy h:mm a");
  };

  const primaryColor = competition?.branding_primary_color || "#1a1a2e";
  const accentColor = competition?.branding_accent_color || "#e94560";

  const handlePdfExport = async () => {
    if (!pdfRef.current) return;
    setIsExporting(true);
    try {
      await exportElementAsPDF(pdfRef.current, filename, { format: "letter", orientation: "landscape", margin: 0 });
    } finally {
      setIsExporting(false);
    }
  };

  const exportRows = buildExportRows();

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" /> Master Sheet Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sheet type toggle */}
        <ToggleGroup type="single" value={sheetType} onValueChange={(v) => v && setSheetType(v)} className="justify-start">
          <ToggleGroupItem value="sub-event" className="text-xs">Sub-Event Sheet</ToggleGroupItem>
          <ToggleGroupItem value="level" className="text-xs">Level Sheet</ToggleGroupItem>
        </ToggleGroup>

        <p className="text-xs text-muted-foreground">{sheetLabel} — {activeRows.length} contestants</p>

        {/* Export buttons */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePdfExport} disabled={isExporting || activeRows.length === 0}>
            <Printer className="h-4 w-4 mr-1.5" />
            {isExporting ? "Exporting…" : "PDF (Branded)"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportGoogleSheets(exportRows, filename)} disabled={activeRows.length === 0}>
            <Sheet className="h-4 w-4 mr-1.5" /> Google Sheets
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV(exportRows, filename)} disabled={activeRows.length === 0}>
            <FileText className="h-4 w-4 mr-1.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportXLSX(exportRows, filename, sheetType === "level" ? "Level Sheet" : "Sub-Event Sheet")} disabled={activeRows.length === 0}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
          </Button>
        </div>

        {/* Hidden branded PDF element */}
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <div
            ref={pdfRef}
            style={{
              width: "11in",
              height: "8.5in",
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
            {/* Branded header */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px", borderBottom: `2px solid ${primaryColor}`, paddingBottom: "6px" }}>
              {competition?.branding_logo_url && (
                <img src={competition.branding_logo_url} crossOrigin="anonymous" style={{ height: "40px", width: "auto", objectFit: "contain" }} alt="" />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "16px", fontWeight: 700, color: primaryColor }}>{competition?.name || "Competition"}</div>
                <div style={{ fontSize: "10px", color: "#666" }}>
                  {sheetType === "level" ? `Level: ${levelName}` : `Sub-Event: ${subEvent?.name || ""}`}
                  {sheetType === "level" && levelData?.subEvents?.length ? ` • ${levelData.subEvents.length} sub-events combined` : ""}
                </div>
              </div>
              <Badge style={{ backgroundColor: accentColor, color: "#fff", fontSize: "8px", padding: "2px 8px", borderRadius: "4px" }}>
                {sheetType === "level" ? "LEVEL MASTER SHEET" : "SUB-EVENT MASTER SHEET"}
              </Badge>
            </div>

            {/* Certification metadata */}
            <div style={{ display: "flex", gap: "16px", fontSize: "8px", color: "#555", marginBottom: "6px", flexWrap: "wrap" }}>
              <div>
                <strong>Judges:</strong>{" "}
                {activeJudgeIds.map((id) => activeJudgeNames.get(id) || "Unknown").join(", ")}
              </div>
              <div>
                <strong>Chief Judge:</strong> {chiefJudgeId ? certNameMap.get(chiefJudgeId) || "—" : "—"} — {chiefCert?.is_certified ? `Certified ${formatCertDate(chiefCert)}` : "Pending"}
              </div>
              <div>
                <strong>Tabulator:</strong> {tabulatorId ? certNameMap.get(tabulatorId) || "—" : "—"} — {tabCert?.is_certified ? `Certified ${formatCertDate(tabCert)}` : "Pending"}
              </div>
              <div>
                <strong>2nd Tab (Witness):</strong> {witnessId ? certNameMap.get(witnessId) || "—" : "—"} — {witnessCert?.is_certified ? `Certified ${formatCertDate(witnessCert)}` : "Pending"}
              </div>
            </div>

            {/* Score table */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8px" }}>
                <thead>
                  <tr style={{ backgroundColor: primaryColor, color: "#fff" }}>
                    <th style={{ padding: "3px 4px", textAlign: "left", fontWeight: 600 }}>Rank</th>
                    <th style={{ padding: "3px 4px", textAlign: "left", fontWeight: 600 }}>Contestant</th>
                    {sheetType === "level" && <th style={{ padding: "3px 4px", textAlign: "left", fontWeight: 600 }}>Sub-Event</th>}
                    {activeJudgeIds.map((jId) => (
                      <th key={jId} style={{ padding: "3px 4px", textAlign: "center", fontWeight: 600 }}>
                        {activeJudgeNames.get(jId) || "Judge"}
                      </th>
                    ))}
                    <th style={{ padding: "3px 4px", textAlign: "center", fontWeight: 600 }}>Total</th>
                    <th style={{ padding: "3px 4px", textAlign: "center", fontWeight: 600 }}>Penalty</th>
                    <th style={{ padding: "3px 4px", textAlign: "center", fontWeight: 600 }}>Final</th>
                    {activeAdvCount != null && <th style={{ padding: "3px 4px", textAlign: "center", fontWeight: 600 }}>Advances</th>}
                  </tr>
                </thead>
                <tbody>
                  {activeRows.map((r, i) => {
                    const advances = activeAdvCount != null && i < activeAdvCount;
                    return (
                      <tr key={i} style={{ backgroundColor: advances ? "#dcfce7" : i % 2 === 0 ? "#fff" : "#f8f8f8", borderBottom: "1px solid #e5e5e5" }}>
                        <td style={{ padding: "2px 4px", fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ padding: "2px 4px" }}>{r.name}</td>
                        {sheetType === "level" && <td style={{ padding: "2px 4px", fontSize: "7px" }}>{(r as any).subEvent || "—"}</td>}
                        {activeJudgeIds.map((jId) => (
                          <td key={jId} style={{ padding: "2px 4px", textAlign: "center", fontFamily: "monospace" }}>
                            {r.judgeScoreMap[jId] != null ? r.judgeScoreMap[jId].toFixed(2) : "—"}
                          </td>
                        ))}
                        <td style={{ padding: "2px 4px", textAlign: "center", fontFamily: "monospace", fontWeight: 600 }}>{r.allJudgesTotal.toFixed(2)}</td>
                        <td style={{ padding: "2px 4px", textAlign: "center", fontFamily: "monospace", color: r.timePenalty > 0 ? "#dc2626" : "#999" }}>{r.timePenalty.toFixed(2)}</td>
                        <td style={{ padding: "2px 4px", textAlign: "center", fontFamily: "monospace", fontWeight: 700, color: primaryColor }}>{r.finalScore.toFixed(2)}</td>
                        {activeAdvCount != null && (
                          <td style={{ padding: "2px 4px", textAlign: "center", fontSize: "7px", fontWeight: advances ? 700 : 400, color: advances ? "#16a34a" : "#999" }}>
                            {advances ? "✓ YES" : ""}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ marginTop: "auto", paddingTop: "6px", borderTop: "1px solid #e5e5e5", display: "flex", justifyContent: "space-between", fontSize: "7px", color: "#999", fontFamily: "monospace" }}>
              <span>@ 2026 SCORZ | Powered by phnyx.dev</span>
              <span>Generated {format(new Date(), "MMM d, yyyy h:mm a")}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
