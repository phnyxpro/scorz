

## Problem

When an organiser reorders contestants via drag-and-drop in the Registrations Manager, judges and tabulators only see the updated order after a manual page refresh. The order should update automatically in real-time.

## Plan

### 1. Add a Supabase Realtime subscription for registration order changes

Create a new hook `useRegistrationsRealtime` in `src/hooks/useRegistrations.ts` that subscribes to `postgres_changes` on `contestant_registrations` and invalidates the `["registrations", competitionId]` query cache on any UPDATE event (which includes `sort_order` changes).

### 2. Wire up realtime in JudgeScoring

In `src/pages/JudgeScoring.tsx`, call the new `useRegistrationsRealtime(competitionId)` hook so the `filteredContestants` list (which already sorts by `sort_order`) auto-refreshes when the organiser reorders.

### 3. Wire up realtime in TabulatorDashboard

The tabulator fetches registrations inside a custom `useJudgingOverview` query. Two changes needed:
- Add `.order("sort_order")` to the registrations query inside `useJudgingOverview` (line ~70) so contestants come back sorted
- Subscribe to realtime changes on `contestant_registrations` and invalidate the `["judging_overview", competitionId]` query cache

### 4. Sort `seContestants` in TabulatorDashboard

The `SubEventWorkspace` component filters contestants with `useMemo` but doesn't sort. Add `.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))` to ensure consistent ordering.

### 5. Include `sort_order` in the tabulator's registration select

The tabulator query only selects `id, full_name, sub_event_id, status, competition_id, user_id`. Add `sort_order` to the select list.

### Summary of files changed

- `src/hooks/useRegistrations.ts` — add `useRegistrationsRealtime` hook
- `src/pages/JudgeScoring.tsx` — call `useRegistrationsRealtime`
- `src/pages/TabulatorDashboard.tsx` — add `sort_order` to select, add `.order("sort_order")`, sort `seContestants`, subscribe to realtime

