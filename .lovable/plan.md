

## Plan: Fix Reorder Delay with Optimistic Updates

### Problem
Every reorder action (drag, arrows, move-after-timed) persists all `sort_order` values to the database sequentially, then invalidates queries, causing the UI to only update after the full network round-trip. This creates a noticeable delay.

### Solution
Apply **optimistic cache updates** — immediately update the React Query cache with the new order, then persist to the database in the background. If the DB write fails, roll back.

### Changes

**1. `src/components/competition/RegistrationsManager.tsx`**
- In `handleDragEnd`, `handleMoveUp`, `handleMoveDown`, and `handleInlineNumberSave`:
  - Before the DB calls, use `qc.setQueryData(["registrations", competitionId], ...)` to optimistically reorder the cached list
  - Run DB updates with `Promise.all` instead of sequential `for` loops
  - On error, invalidate to restore correct state

**2. `src/components/scoring/ContestantReorderModal.tsx`**
- The modal receives `contestants` as a prop from the parent query. It cannot set query data directly since it doesn't own the query key.
- Wrap `persistOrder` to call parent invalidation, but also use `Promise.all` (already done) and add optimistic cache set for `["judging_overview"]` and `["approved-contestants-order"]`

**3. `src/components/competition/PerformanceOrder.tsx`**
- In `handleDragEnd` and `randomizeDraw`:
  - Use `qc.setQueryData(["approved-contestants-order", subEventId], reordered)` before the DB writes
  - Already uses `Promise.all` — keep that

### Key Pattern (applied everywhere)
```typescript
// Before DB writes — instant UI update
qc.setQueryData(["registrations", competitionId], (old) => {
  if (!old) return old;
  return reordered; // the new order array
});

// DB writes in parallel
await Promise.all(
  reordered.map((r, i) =>
    supabase.from("contestant_registrations")
      .update({ sort_order: i })
      .eq("id", r.id)
  )
);

// Refetch to confirm
qc.invalidateQueries({ queryKey: ["registrations", competitionId] });
```

### Files to Edit
1. `src/components/competition/RegistrationsManager.tsx` — optimistic updates + `Promise.all` for all reorder functions
2. `src/components/scoring/ContestantReorderModal.tsx` — optimistic cache update in `persistOrder`
3. `src/components/competition/PerformanceOrder.tsx` — optimistic cache update in drag/randomize handlers

