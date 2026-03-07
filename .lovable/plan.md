

## Fix: Tabulator Seeing Unassigned Events + Stuck as Pending

### Root Cause

Two related bugs:

1. **`accept_staff_invitations` didn't fire properly** — Jean Luc Robinson's invitation has `accepted_at = NULL` despite having logged in. The RPC is called on `SIGNED_IN` in AuthContext but the error is silently swallowed. No `sub_event_assignments` rows were created for this user, even though the `staff_invitation_sub_events` table has 2 sub-events assigned (Trinidad, Tobago).

2. **`useStaffView` lacks a `staff_invitations` fallback** — The Dashboard's judge flow (lines 76-104 of Dashboard.tsx) already falls back to `staff_invitations` + `staff_invitation_sub_events` when `sub_event_assignments` is empty. But `useStaffView` (used by TabulatorDashboard) does NOT have this fallback, so when acceptance fails, the tabulator either sees nothing or — if cached competitions leak through — unassigned events.

### Fix Plan

**1. Add `staff_invitations` fallback to `useStaffView`** (`src/hooks/useStaffView.ts`)

Update `useStaffView` to check `staff_invitations` + `staff_invitation_sub_events` when `sub_event_assignments` returns empty. Mirror the same pattern from Dashboard.tsx lines 79-103:
- If `myAssignments` is empty and user email is available, query `staff_invitations` by email where `accepted_at IS NULL`
- Then query `staff_invitation_sub_events` for those invitation IDs
- Use resulting sub-event IDs as the fallback for `assignedSubEventIds`

**2. Re-trigger acceptance on each login** (`src/contexts/AuthContext.tsx`)

The RPC call already exists on `SIGNED_IN`, but add error logging so failures aren't silently swallowed. Also call it on `TOKEN_REFRESHED` as a retry mechanism for cases where initial acceptance failed.

**3. Database fix: manually accept this user's invitation**

Run a one-time migration/RPC call to accept Jean Luc Robinson's pending invitation, provisioning his `sub_event_assignments` and marking `accepted_at`.

### Files changed
- `src/hooks/useStaffView.ts` — add `staff_invitations` fallback query when assignments are empty
- `src/contexts/AuthContext.tsx` — add error logging to `accept_staff_invitations` RPC call + retry on token refresh
- Database migration — manually run `accept_staff_invitations` for user `e5622288-b755-4f71-a126-c92f41db3ef5`

