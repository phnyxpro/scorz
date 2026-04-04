

## Add File Upload with Level Selection and Column Matching to Sheet Editor

### Overview
Add an "Upload File" button to the RegistrationsSheetEditor toolbar that opens a mini-wizard (inline popover or collapsible panel) allowing users to upload a CSV/XLSX file, pick a target level/sub-event, map columns to the sheet's existing columns, and merge parsed rows into the sheet grid.

### Plan

**File: `src/components/competition/RegistrationsSheetEditor.tsx`**

1. **Add upload state** — new state variables: `showUploadPanel` (boolean), `uploadHeaders` (string[]), `uploadRows` (parsed raw rows), `uploadMapping` (Record<string, string> mapping CSV header to column key), `uploadSubEventId` (selected sub-event), `uploadStep` (1=file+level, 2=column map, 3=confirm).

2. **Add "Upload" button** in the toolbar (next to "Add Row") with an `<Upload>` icon. Clicking toggles `showUploadPanel`.

3. **Upload panel UI** — render a collapsible section above the sheet table (or a small inline dialog) with 3 steps:
   - **Step 1**: File input (CSV/XLSX) + Level/Sub-Event selector. Parse file using existing `readXLSXToJson` from `@/lib/export-utils`. Auto-detect headers.
   - **Step 2**: Column mapping table — each CSV header gets a dropdown to pick from the sheet's `columns` array. Use fuzzy matching (normalize + includes) to auto-map columns on parse. Show mapped count.
   - **Step 3**: Preview row count and confirm. "Add to Sheet" button merges rows.

4. **Merge logic** — on confirm, convert each uploaded row into the sheet's row format using the column mapping. For select-type columns (sub-event, categories), resolve names to IDs by matching against the column's `options` array. Set `status: "approved"`, assign the chosen `sub_event_id`, generate `temp_id` and `sort_order`. Append rows to `data` via `recordChange` + `setData`.

5. **Reuse existing utilities** — `readXLSXToJson` for file parsing, the existing `columns` definition for mapping targets, and the existing fuzzy-match name-to-ID resolution from `handlePaste`.

### Technical Details

- Fuzzy auto-mapping: normalize both CSV header and column label (lowercase, strip non-alphanumeric), compare with includes/exact match
- The level selector filters available sub-events; selected sub-event is applied to all imported rows
- Column mapping dropdown shows "— Skip —" plus all sheet columns
- Select columns resolve pasted names to option IDs (same logic as existing paste handler)
- No new dependencies needed; all parsing utilities already exist

