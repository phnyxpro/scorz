

## Revamp Score Sheet Downloads to Match Template + Add Preview Modal

### What changes

The uploaded Excel template reveals the correct Olympic-style scoring layout that differs from the current implementation. The master sheet should show each judge's **raw total** (not `final_score`), with explicit **MIN**, **MAX**, **Total**, **Penalty**, and **Final Score** columns — penalty applied once at the aggregate level, not per-judge. Per-judge sheets should show criterion breakdowns with a raw total. A preview modal will let organizers inspect the data before downloading.

### Template structure (from uploaded file)

**Master Sheet:**
```text
# | Contestant | TIME | Judge1 | Judge2 | ... | Total | MIN | MAX | Penalty | Final Score
```
- Judge columns = each judge's `raw_total` (sum of criteria)
- Total = sum of all judge raw totals
- MIN = lowest judge raw total
- MAX = highest judge raw total
- Penalty = time penalty (from penalty rules based on elapsed time)
- Final Score (Olympic) = `(Total - MIN - MAX) / (n - 2) - Penalty`
- Penalty legend shown as a reference section (will be in the Excel, and visible in the preview)

**Per-Judge Sheets:**
```text
Contestant | Criterion1 | Criterion2 | ... | Total
```
- Simple criterion breakdown per contestant, with raw total

### Preview modal

A dialog triggered by an "eye" icon / "Preview" button per sub-event that shows:
- **Tabs** for Master and each Judge sheet inside the modal
- Data rendered in an HTML table matching the export layout
- Penalty legend sidebar/footer
- "Download Excel" and "Download CSV" buttons inside the modal
- Performance time (from `performance_timer_events` table, `elapsed_seconds` on `stop` events) formatted as `M:SS.xx`

### Implementation

**File: `src/components/competition/ScoreSheetDownloads.tsx`**
- Update `fetchSubEventData` to also fetch `performance_timer_events` (stop events) and `penalty_rules` for the competition
- Update `FetchedData` interface to include timer data and penalty rules
- Rewrite `buildMasterSheet`:
  - Use `raw_total` per judge (not `final_score`)
  - Add TIME column (formatted elapsed seconds)
  - Add Total (sum of raw totals), MIN, MAX columns
  - Compute Final Score using Olympic formula: `(Total - MIN - MAX) / (n - 2) - Penalty`
  - Penalty determined by matching elapsed_seconds against penalty_rules
- Simplify `buildJudgeSheet` — remove Time Penalty and Final Score columns, just show criteria + Total
- Add a "Preview" button next to each sub-event
- Add state for which sub-event preview is open + fetched preview data

**File: `src/components/competition/ScoreSheetPreviewModal.tsx` (new)**
- Dialog/Sheet component receiving the built sheet data
- Tabs component: "Master" tab + one tab per judge
- Renders data in `<Table>` components
- Penalty legend card showing configured penalty tiers
- Download Excel / CSV buttons in the modal footer
- Responsive scroll area for wide tables

### Files changed
- `src/components/competition/ScoreSheetDownloads.tsx` — revamp data building to match template, add Preview button and modal trigger
- `src/components/competition/ScoreSheetPreviewModal.tsx` (new) — tabbed preview modal with master + per-judge tables, penalty legend, and download actions

