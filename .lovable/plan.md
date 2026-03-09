

## Plan: Replace Score Card Export with Master Sheet Exports in Tabulator Dashboard

### Summary
Remove the `ScoreCardExporter` from the Tabulator sub-event workspace and replace it with an export panel offering Level Master Sheet and Sub-Event Master Sheet downloads in CSV, Google Sheets, Excel, and branded landscape PDF (8.5" × 11" borderless) formats. The PDF will include a branded header with competition info, level/sub-event details, judges, tabulators, and certification timestamps.

---

### Changes

#### 1. New Component: `src/components/tabulator/MasterSheetExporter.tsx`

A new export panel that replaces `ScoreCardExporter`. It will:

- Accept competition data, sub-event scores, level info, judge/tabulator names, certification dates, and branding (logo URL, primary/accent colors)
- Provide two export targets via a toggle: **Sub-Event Master Sheet** and **Level Master Sheet**
- For each, offer 4 export formats via `ExportDropdown`-style buttons: CSV, Google Sheets CSV, Excel (XLSX), and PDF
- **PDF export** uses `jsPDF` + `html2canvas` to render a hidden branded element:
  - **Landscape 8.5" × 11" (letter), borderless** (0 margin)
  - **Branded header**: competition logo (from `branding_logo_url`), competition name styled with `branding_primary_color`, level name, sub-event name
  - **Metadata row**: Judge names, Tabulator name, 2nd Tabulator/Witness name, certification dates/times for Chief Judge, Tabulator, and Witness
  - **Score table**: Same columns as the master sheet pages (Rank, Contestant, per-judge raw totals, All Judges Total, Penalty, Final Score, Advances)
  - **Footer**: "@ 2026 SCORZ | Powered by phnyx.dev"
- CSV/XLSX exports use the same `exportCSV`, `exportXLSX`, `exportGoogleSheets` utilities with competition/certification metadata prepended as header rows

#### 2. Update `src/pages/TabulatorDashboard.tsx` — `SubEventWorkspace`

- Remove the `ScoreCardExporter` import and usage (lines 265-272)
- Import and render the new `MasterSheetExporter` in its place
- Pass required data: competition info (fetched via a query using `competitionId`), sub-event scores, level data, judge names from `judgeProfiles`, certification statuses/dates from `chiefCert`/`tabCert`/`witnessCert`, and branding fields
- The component needs competition branding data — add a small query for `competitions` table selecting `name, branding_logo_url, branding_primary_color, branding_accent_color` using the `competitionId` prop already available

#### 3. Update `src/lib/export-utils.ts`

- Add a `exportBrandedPDF` helper that accepts a pre-rendered HTML element and exports as landscape letter with 0 margins (borderless). This is a thin wrapper around `exportElementAsPDF` with `{ format: 'letter', orientation: 'landscape', margin: 0 }`.

### Technical Details

- The hidden PDF render element will be a `div` styled at exactly 11in × 8.5in with inline styles for print fidelity
- Branding logo rendered via `<img>` with `crossOrigin="anonymous"` for html2canvas compatibility
- Certification info formatted as: "Chief Judge: [Name] — Certified [Date Time] | Tabulator: [Name] — Certified [Date Time] | 2nd Tabulator (Witness): [Name] — Certified [Date Time]"
- For Level Master Sheet PDF, the component will fetch level-wide data (all sub-events in the level) similar to `useLevelMasterSheet` hook
- Score calculation uses the existing `calculateMethodScore` for consistency

### Files Modified
1. `src/components/tabulator/MasterSheetExporter.tsx` — **new file**
2. `src/pages/TabulatorDashboard.tsx` — swap `ScoreCardExporter` for `MasterSheetExporter`, add competition branding query
3. `src/lib/export-utils.ts` — add `exportBrandedPDF` convenience function

