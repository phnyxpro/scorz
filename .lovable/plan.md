

## Plan: Import Scores from CSV — Reusable UI + NPS 2026 Import

### Overview
Build a reusable "Import Scores" CSV upload dialog accessible from the Score Sheet Downloads section. This will allow organizers to parse judge score CSVs, map columns to rubric criteria, match contestants by name, and bulk-insert `judge_scores` rows. Then use it to import the uploaded Kwame Weekes scores.

### How It Works

1. **New component: `ScoreImportDialog`** — A 4-step wizard dialog:
   - **Step 1 — File & Judge Selection**: Upload CSV/Excel file, select the target sub-event, and select which judge the scores belong to (from assigned judges list)
   - **Step 2 — Column Mapping**: Auto-map CSV column headers to rubric criteria by fuzzy name matching (e.g. "Voice and Articulation" → criterion with that name). Allow manual override via dropdowns. Also detect a "Total" column.
   - **Step 3 — Preview & Validation**: Show a table of matched contestants (fuzzy name match against `contestant_registrations` for the sub-event). Flag unmatched contestants, highlight rows with scores vs blank rows (skip blanks). Show computed raw_total vs CSV total for verification.
   - **Step 4 — Import**: Upsert `judge_scores` rows — for each matched contestant, build the `criterion_scores` JSONB (keys = rubric `sort_order` indices), compute `raw_total`, and insert/update.

2. **"Import Scores" button** added to each sub-event row in `ScoreSheetDownloads`, alongside existing Preview/Excel/CSV/Blank buttons.

3. **Data mapping logic**:
   - CSV criterion columns → matched to `rubric_criteria` by name similarity
   - Contestant names → matched to `contestant_registrations.full_name` using case-insensitive comparison, with fuzzy fallback
   - `criterion_scores` keys = `String(rubric_criteria.sort_order)` per existing convention
   - `raw_total` = sum of all criterion scores
   - Rows with all-empty scores are skipped

### Technical Details

**Files to create:**
- `src/components/competition/ScoreImportDialog.tsx` — The wizard dialog component

**Files to modify:**
- `src/components/competition/ScoreSheetDownloads.tsx` — Add "Import Scores" button per sub-event

**Key considerations:**
- Reuses `xlsx` library already installed for CSV/Excel parsing (same as BulkUploadDialog)
- Uses existing `fetchSubEventData()` from ScoreSheetDownloads to get contestants, criteria, and assigned judges
- Upserts scores: if a `judge_scores` row already exists for that judge+contestant+sub_event, it updates; otherwise inserts
- Only imports for one judge at a time (filename hints at judge name for auto-selection)
- No database changes needed — uses existing `judge_scores` table structure

