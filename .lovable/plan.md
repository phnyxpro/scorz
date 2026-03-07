

## Add Blank Template Download to Score Sheet Downloads

### Problem
Currently, the score sheet downloads only include judges who have **already scored** (derived from `judge_scores`). Organizers need a **blank template** that includes tabs for **all assigned judges** (from `sub_event_assignments`) — not just those who have submitted scores — so they can print blank score sheets before the event.

### Changes

**`src/components/competition/ScoreSheetDownloads.tsx`**

1. Update `fetchSubEventData` to also fetch assigned judges from `sub_event_assignments` where `role = 'judge'` for the sub-event, plus their profile names. Store as `assignedJudges: { user_id: string; name: string }[]` on `FetchedData`.

2. Add a new `buildBlankTemplate` function:
   - **Master sheet**: Columns are `#`, `Contestant`, `TIME`, one column per **assigned judge** (empty values), `Total`, `MIN`, `MAX`, `Penalty`, `Final Score` — all score values left blank.
   - **Per-judge sheets**: One tab per assigned judge with columns `Contestant`, each rubric criterion name, `Total` — all values blank.

3. Add a "Blank Template" download button (with a `FileSpreadsheet` icon variant) next to the existing Preview/Excel/CSV buttons for each sub-event. This button does **not** require existing scores — it fetches contestants, assigned judges, and criteria only.

4. Update `FetchedData` interface to include `assignedJudges`.

**`src/components/competition/ScoreSheetPreviewModal.tsx`**
- No changes needed — the blank template is download-only (no preview required since it's empty).

### Implementation detail

```typescript
// New fetch for assigned judges inside fetchSubEventData
const assignmentsRes = await supabase
  .from("sub_event_assignments")
  .select("user_id")
  .eq("sub_event_id", subEventId)
  .eq("role", "judge");

// Merge assigned judge IDs with any from scores for profile lookup
// Store assignedJudges: { user_id, name }[] on FetchedData
```

The blank template handler will call a lighter fetch (no scores needed) and export directly — no "no scores" guard since the template is meant to be empty.

### Files changed
- `src/components/competition/ScoreSheetDownloads.tsx` — add assigned judges fetch, blank template builder, and download button

