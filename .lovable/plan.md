

## Plan: Enable Real-Time Score Updates in Tabulator Overview

### Problem
The tabulator dashboard has two data paths:
1. **SubEventWorkspace** (the "Score Summary" / "Side-by-Side Detail" tabs) — uses `useAllScoresForSubEvent` which IS invalidated by the `useJudgeScoresRealtime` hook. This already updates in real-time.
2. **Overview contestant list** (the expandable rows showing per-contestant scores and judge counts) — uses `useJudgingOverview` with query key `["judging_overview", competitionId]`. This query is **never invalidated** when judges submit or update scores, so the outer list stays stale until a manual refresh.

### Solution
Add a realtime subscription on the `judge_scores` table (scoped to the sub-events of the selected competition) that invalidates `["judging_overview", competitionId]` when any score changes.

### Changes

**`src/pages/TabulatorDashboard.tsx`**
- After `useRegistrationsRealtime(selectedCompId)` (line 456), add a `useEffect` that subscribes to `postgres_changes` on `judge_scores` for all sub-event IDs from the overview data
- On any change event, call `qc.invalidateQueries({ queryKey: ["judging_overview", selectedCompId] })`
- This ensures the outer contestant list (score counts, expanded side-by-side views) updates live as judges enter scores

The subscription will use a single channel filtered by `sub_event_id` values from `overview.subEvents`, re-subscribing when the selected competition or sub-event list changes.

