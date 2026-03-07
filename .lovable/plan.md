

## Show Chief Judge Badge & Assignments for Uninvited Staff

### Problem
Jean-Claude Cournand is invited as a Chief Judge for National Poetry Slam 2026, but:
1. The header badges only show roles from `user_roles` — "chief_judge" is an assignment flag (`is_chief`), not a standalone role, so it never appears
2. His invitation hasn't been accepted yet, so `sub_event_assignments` is empty → Dashboard shows 0 assignments and no competitions
3. Chief Judge action cards don't appear because `hasChiefAssignment` is false

### Plan

**1. Add chief judge detection to header badges** (`src/components/AppLayout.tsx`)
- Query `sub_event_assignments` for `is_chief=true` OR `staff_invitations` for `is_chief=true` matching the effective user
- If found, append a "chief judge" badge alongside existing role badges
- Use `effectiveUserId` (masquerade-aware) for the query

**2. Fall back to `staff_invitations` for assignments** (`src/pages/Dashboard.tsx`)
- In `useAssignedCompetitions`, when `sub_event_assignments` returns empty, query `staff_invitations` by the user's email to find pending assignments with their competition, sub-event, and `is_chief` flag
- This ensures competitions and sub-events appear even before invitation acceptance
- Need the target user's email: available from `masquerade.email` or `user.email`

**3. Show Chief Judge action cards** (`src/pages/Dashboard.tsx`)
- `buildJudgeCards` already supports `hasChiefAssignments` — the fix is ensuring `hasChiefAssignment` is derived from both `sub_event_assignments` AND `staff_invitations`

**4. Sub-event quick links from invitations** (`src/pages/Dashboard.tsx`)
- The assigned sub-events query should also fall back to `staff_invitations` data when `sub_event_assignments` is empty

### Files changed
- `src/components/AppLayout.tsx` — add chief judge badge via query
- `src/pages/Dashboard.tsx` — update `useAssignedCompetitions` and sub-event queries to fall back to `staff_invitations`

