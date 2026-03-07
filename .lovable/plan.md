

## Fix Criterion Score Columns Showing Dashes

### Problem
The `criterion_scores` JSONB in `judge_scores` stores keys as numeric indices (`"0"`, `"1"`, `"2"`, ...) based on `sort_order`, but both `ScoreSummaryTable` and `SideBySideScores` try to look up values using rubric name strings (e.g., `"Content & Meaning"`). This mismatch causes all individual criterion columns to show dashes.

### Changes

**1. `src/pages/TabulatorDashboard.tsx`**
- Build an `indexToName` mapping from the rubric data: `{ "0": "Content & Meaning", "1": "Vocal Delivery", ... }` using `sort_order` as the key
- Pass `indexToName` to both `SideBySideScores` (already accepts this prop) and `ScoreSummaryTable` (needs new prop)

**2. `src/components/tabulator/ScoreSummaryTable.tsx`**
- Add `indexToName` prop (`Record<string, string>`)
- Remap `criterion_scores` numeric keys to rubric names before computing averages (same pattern already used in `SideBySideScores`)

**3. `src/pages/TabulatorDashboard.tsx` (overview section ~line 695)**
- Also pass `indexToName` to the `SideBySideScores` used in the overview/accordion expandable rows

### How the mapping works
The rubric array is already sorted by `sort_order`. The index `i` in that array corresponds to key `"i"` in `criterion_scores`. So:
```typescript
const indexToName = useMemo(() => {
  const m: Record<string, string> = {};
  (overview?.rubric || []).forEach((r: any, i: number) => { m[String(i)] = r.name; });
  return m;
}, [overview?.rubric]);
```

### Files changed
- `src/pages/TabulatorDashboard.tsx` — build and pass `indexToName`
- `src/components/tabulator/ScoreSummaryTable.tsx` — accept `indexToName`, remap keys

