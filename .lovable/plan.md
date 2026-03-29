

# Fix: Judges & Contestants Not Showing for Semi-Finals

## Root Cause

The `contestant_registrations` table has an RLS policy ("Staff can view assigned registrations") that restricts visibility to only the specific sub-events a staff member is assigned to. The tabulator is assigned to Audition sub-events but NOT the Semi-final sub-event, so RLS blocks all Semi-final contestant data.

The Tabulator Dashboard and Judge Scoring pages both use competition-wide queries (fetching all registrations for a competition), but RLS silently filters out rows for unassigned sub-events — resulting in the sub-event card appearing with 0 judges/contestants.

## Fix

### 1. Update RLS policy on `contestant_registrations`

Replace the current "Staff can view assigned registrations" policy with one that grants access to **all registrations in any competition** where the staff member has at least one assignment:

```sql
DROP POLICY "Staff can view assigned registrations" ON contestant_registrations;

CREATE POLICY "Staff can view competition registrations"
ON contestant_registrations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM sub_event_assignments sa
    JOIN sub_events se ON se.id = sa.sub_event_id
    JOIN competition_levels cl ON cl.id = se.level_id
    WHERE sa.user_id = auth.uid()
      AND cl.competition_id = contestant_registrations.competition_id
      AND sa.role = ANY(ARRAY['judge'::app_role, 'tabulator'::app_role, 'witness'::app_role])
  )
);
```

This ensures that once a tabulator/judge/witness is assigned to any sub-event in a competition, they can see all contestant registrations for that competition — which is needed for level advancement, cross-level scoring context, and the judging overview.

### 2. Filter displayed sub-events for tabulators (optional refinement)

In `TabulatorDashboard.tsx`, the level/sub-event cards already show all sub-events from `useJudgingOverview`. No code change is strictly needed since the tabulator needs to see the full competition picture for level promotion workflows. The data will now be visible thanks to the RLS fix.

## Files Changed

| File | Change |
|------|--------|
| New migration | Update RLS policy on `contestant_registrations` |

No application code changes are needed — the queries already fetch competition-wide data; they were just being silently filtered by RLS.

