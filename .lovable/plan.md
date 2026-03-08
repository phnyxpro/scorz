

## Plan: Fix Query Key Mismatch for Real-Time Reorder Updates

### Root Cause
The tabulator dashboard query uses `["judging_overview", competitionId]` as its key, but all optimistic updates and invalidations in `ContestantReorderModal`, `TabulatorTimer`, and `RegistrationsManager` use just `["judging_overview"]` (without `competitionId`). React Query does **exact matching** for `setQueryData` and partial matching for `invalidateQueries` — but since the second element is missing, neither the optimistic update nor the invalidation hits the actual cache entry.

Same issue with `["approved-contestants-order"]` which is used with `subEventId` in `PerformanceOrder.tsx` (`["approved-contestants-order", subEventId]`).

### Fix

**1. `src/components/scoring/ContestantReorderModal.tsx`**
- `persistOrder` optimistic `setQueryData` calls use `["judging_overview"]` — these need to either:
  - Use partial query matching via `queryClient.setQueriesData({ queryKey: ["judging_overview"] }, ...)` (matches all queries starting with `["judging_overview"]`), OR
  - Pass `competitionId` as a prop and use the full key
- Same for `["approved-contestants-order"]`
- Fix both `setQueryData` calls and `invalidateQueries` calls to use partial matching

**2. `src/components/scoring/TabulatorTimer.tsx`**
- `moveAfterLastTimed` invalidates `["judging_overview"]` — needs partial match
- Add optimistic `setQueryData` before the DB writes (currently missing — only invalidates after)

**3. `src/components/competition/RegistrationsManager.tsx`**
- `handleStatusChange` invalidates `["judging_overview"]` — needs partial match

### Implementation Detail
Use `queryClient.invalidateQueries({ queryKey: ["judging_overview"] })` which already does **prefix matching** by default — so this should already work for invalidation. The real problem is `setQueryData` which requires an **exact key match**.

**Solution**: Replace `qc.setQueryData(["judging_overview"], ...)` with:
```typescript
qc.setQueriesData({ queryKey: ["judging_overview"] }, (old) => { ... });
```
This uses the `setQueriesData` (plural) API which matches all queries with that prefix. Same fix for `["approved-contestants-order"]`.

Also add optimistic update in `TabulatorTimer.moveAfterLastTimed` instead of just invalidating.

### Files to Edit
1. `src/components/scoring/ContestantReorderModal.tsx` — change `setQueryData` to `setQueriesData` for both keys
2. `src/components/scoring/TabulatorTimer.tsx` — add optimistic update in `moveAfterLastTimed` using `setQueriesData`
3. `src/components/competition/RegistrationsManager.tsx` — change `setQueryData` to `setQueriesData` for judging_overview key

