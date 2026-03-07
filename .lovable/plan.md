

## Problem

Masquerade mode only swaps the **roles** displayed in the UI — it does not swap the **user identity** used by data-fetching hooks. The Dashboard has two issues:

1. **Welcome message** (line 183): Uses `user.user_metadata.full_name` which is the real logged-in user (Stefan), not the masquerade target (Shivanee).
2. **Data queries**: `useAssignedCompetitions` (line 146) and `useDashboardStats` both use `user.id` — the real user's ID — so the dashboard shows Stefan's assignments and stats, not Shivanee's.

The masquerade feature is client-side only (no session swap), so the fix is to thread the masquerade target's identity through the Dashboard UI and queries.

## Plan

### 1. Update Dashboard welcome message

Use `masquerade.fullName` when masquerading, falling back to `user.user_metadata.full_name` otherwise.

### 2. Update `useAssignedCompetitions` to accept a `userId` parameter

Instead of always using `user?.id`, pass the effective user ID:
- Normal mode: `user.id`
- Masquerade mode: `masquerade.userId`

### 3. Update `useDashboardStats` to use the effective user ID

Same pattern — accept or derive the effective user ID from masquerade context. Queries that filter by `user.id` (judge assignments, uncertified scores, contestant registrations) should use `masquerade.userId` when masquerading.

### Files changed
- `src/pages/Dashboard.tsx` — use masquerade identity for welcome text and pass effective userId to hooks
- `src/hooks/useDashboardStats.ts` — accept effective userId parameter, use it in queries

