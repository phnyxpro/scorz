

## Downloadable Score Sheets in Scoring Settings

### What you get

A new "Score Sheet Downloads" card in the Scoring Settings section of each competition. For each sub-event, organizers can download a multi-tab Excel workbook (.xlsx) or Google Sheets-compatible CSV containing:

**Tab 1 — Master Sheet**: Contestants as rows, judges as columns, showing each judge's final score, time penalty, and the overall total/average per contestant (ranked).

**Tab 2+ — Per-Judge Sheets**: One tab per judge. Contestants as rows, rubric criteria as columns, showing individual criterion scores, raw total, time penalty, and final score.

### About Google Sheets two-way sync

True two-way sync with Google Sheets requires a Google Sheets API connector, which is not currently available. What we can provide:
- **One-click download** as Google Sheets-compatible CSV (UTF-8 BOM) that opens directly in Google Sheets
- **Multi-tab Excel export** (.xlsx) which Google Sheets can import natively
- If you'd like live two-way sync in the future, we'd need to set up a Google Sheets API integration with OAuth

### About exportable score cards

The `ScoreCardExporter` component already exists and is available on:
- **Tabulator Dashboard** — visible after tabulator certification
- **Results Hub** — visible for admins/organizers

It exports individual or batch PDF score cards per contestant. No changes needed there unless you want it surfaced elsewhere.

### Implementation

**File: `src/components/competition/ScoringSettingsManager.tsx`**
- Add a new "Score Sheet Downloads" card at the bottom
- For each sub-event, show a download button that:
  1. Fetches contestant registrations, judge scores, rubric criteria, judge profiles, and penalty rules
  2. Builds a master sheet tab: `Rank | Contestant | Judge1 | Judge2 | ... | Time Penalty | Total | Average`
  3. Builds per-judge tabs: `Contestant | Criterion1 | Criterion2 | ... | Raw Total | Time Penalty | Final`
  4. Uses `xlsx` library (already installed) to create a multi-sheet workbook
  5. Also offers Google Sheets CSV export (master sheet only, since CSV is single-tab)

**File: `src/lib/export-utils.ts`**
- Add `exportMultiSheetXLSX(sheets: { name: string; rows: SheetRow[] }[], filename: string)` helper for multi-tab workbooks

### Files changed
- `src/lib/export-utils.ts` — add multi-sheet XLSX export function
- `src/components/competition/ScoringSettingsManager.tsx` — add Score Sheet Downloads card with per-sub-event download buttons

