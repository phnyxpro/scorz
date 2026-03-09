

## Fix 107 Legacy Score Records with Numeric Index Keys

### Problem
107 judge_score records in the Trinidad sub-event still use numeric string keys (`"0"`, `"1"`, ...) in their `criterion_scores` JSONB field instead of UUID keys. This causes blank criterion cells in all display pages (Score Tables, Tabulator, Results, Post-Event Portal) and prevents sliders from showing saved values when judges revisit their scorecards.

### Solution
Run a single SQL UPDATE to convert all 107 records from numeric keys to UUID keys in one batch. The mapping is deterministic based on `sort_order`:

- `"0"` → `b0dbb2db-6f1e-463f-8c22-9bdd9c6569b1` (Voice and Articulation)
- `"1"` → `70c63092-7a98-4cfc-9c8a-bb158678addc` (Stage Presence)
- `"2"` → `9ca31e7d-f95c-421a-9442-c148a49e5ed6` (Dramatic Appropriateness)
- `"3"` → `4fbe8675-26d5-408a-b694-2d06d2beb6ed` (Literary Devices)
- `"4"` → `2794170b-f3ed-4067-a12f-21caba981e18` (Use of Language)
- `"5"` → `e3a9397f-199c-4a67-bba0-386df5273565` (Continuity / Storyline)

### Technical Details

**Data update** (using insert tool, not migration):
```sql
UPDATE judge_scores
SET criterion_scores = jsonb_build_object(
  'b0dbb2db-6f1e-463f-8c22-9bdd9c6569b1', (criterion_scores->>'0')::numeric,
  '70c63092-7a98-4cfc-9c8a-bb158678addc', (criterion_scores->>'1')::numeric,
  '9ca31e7d-f95c-421a-9442-c148a49e5ed6', (criterion_scores->>'2')::numeric,
  '4fbe8675-26d5-408a-b694-2d06d2beb6ed', (criterion_scores->>'3')::numeric,
  '2794170b-f3ed-4067-a12f-21caba981e18', (criterion_scores->>'4')::numeric,
  'e3a9397f-199c-4a67-bba0-386df5273565', (criterion_scores->>'5')::numeric
)
WHERE criterion_scores ? '0'
  AND NOT criterion_scores ? 'b0dbb2db-6f1e-463f-8c22-9bdd9c6569b1'
  AND sub_event_id IN (
    SELECT se.id FROM sub_events se
    JOIN competition_levels cl ON cl.id = se.level_id
    WHERE cl.competition_id = '04b250a2-e4bc-4716-aa56-d0c9c4c3bc35'
  );
```

The `raw_total`, `time_penalty`, and `final_score` columns remain unchanged since the values are identical — only the JSONB keys change.

No code changes needed — the `normalizeCriterionScores` function in `JudgeScoring.tsx` already handles this at the UI level, but fixing the data at source ensures all pages (Tabulator, Results, Post-Event, Score Tables) display correctly without needing normalization logic everywhere.

