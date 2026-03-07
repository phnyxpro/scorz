

## Problem

The Judging Hub (`/judging`) uses `useCompetitions()` which fetches **all** competitions from the database. Staff roles like tabulators and judges should only see competitions they are assigned to via `sub_event_assignments`. The existing `useStaffView` hook already solves this — it returns `assignedCompetitions` filtered by the user's assignments.

## Plan

### Update `JudgingHubContent` to scope competitions by role

In `src/pages/JudgingHub.tsx`:

1. Import `useAuth` and `useStaffView`
2. Check if the user has an admin or organizer role using `hasRole()`
3. **If admin/organizer**: continue using `useCompetitions()` (see all competitions)
4. **If judge/tabulator (staff)**: use `useStaffView()` and show only `assignedCompetitions`
5. Merge the two loading states and pass the correct competition list to the existing filtering/rendering logic

The change is isolated to `JudgingHubContent` — roughly 10 lines of logic at the top of the component. No database or RLS changes needed.

### File changed
- `src/pages/JudgingHub.tsx`

