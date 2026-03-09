

## Bug: `indexToName` Maps Wrong Keys in Score Display Components

### Root Cause

The `criterion_scores` field in `judge_scores` uses **UUID keys** (e.g., `"2794170b-f3ed-4067-a12f-21caba981e18": 3.5`), matching the `rubric_criteria.id` values.

However, both **ScoreTablesPage.tsx** (line 53-57) and **PostEventPortal.tsx** (line 42-46) build `indexToName` using **numeric string indices**:

```js
sortedRubric.forEach((r, i) => { map[String(i)] = r.name; });
// Produces: { "0": "Voice and Articulation", "1": "Stage Presence", ... }
```

When `SideBySideScores` and `PrintableScorecard` try to resolve a UUID key like `"2794170b-..."` through this map, it falls back to the raw UUID. Then `rubricNames` (display names) don't match, so all criterion cells show "—".

### Affected Components

1. **ScoreTablesPage.tsx** — `indexToName` used by `SideBySideScores`
2. **PostEventPortal.tsx** — `indexToName` used by `PrintableScorecard` and `criterionAverages` calculation
3. **TabulatorDashboard.tsx** — likely has the same pattern (needs verification)
4. **ContestantScoresOverview.tsx** — likely has the same pattern

### Fix

In each affected file, change the `indexToName` builder from numeric index to UUID:

```js
// Before (broken):
sortedRubric.forEach((r, i) => { map[String(i)] = r.name; });

// After (correct):
sortedRubric.forEach((r) => { map[r.id] = r.name; });
```

This single-line change in each file ensures UUID keys from `criterion_scores` correctly resolve to display names.

### Files to Update

1. `src/pages/ScoreTablesPage.tsx` — line 55
2. `src/pages/PostEventPortal.tsx` — line 44
3. `src/pages/TabulatorDashboard.tsx` — verify and fix same pattern
4. `src/pages/ContestantScoresOverview.tsx` — verify and fix same pattern

