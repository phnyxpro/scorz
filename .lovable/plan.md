

## Add "Activate Scoring" Toggle for Tabulators

### Problem
The tabulator dashboard sub-event cards show a status badge and a Select/Close button. The user wants a toggle switch between them to let tabulators activate/deactivate scoring for a sub-event. The Select/Close button icon should also be removed.

### Challenge: RLS Permissions
Tabulators cannot update the `competitions` table (only admin/organizer have write access). A new **security definer function** is needed to allow tabulators to safely update only the `active_scoring_level_id` and `active_scoring_sub_event_id` fields.

### Plan

**1. Database migration** — Create a security definer function `set_active_scoring` that:
- Accepts `_competition_id`, `_level_id` (nullable), `_sub_event_id` (nullable)
- Checks the caller has tabulator, admin, or organizer role
- Updates only the two active scoring columns on the competition

**2. `src/hooks/useCompetitions.ts`** — Add a new `useSetActiveScoring` hook that calls the RPC function instead of direct table update, so tabulators can use it.

**3. `src/pages/TabulatorDashboard.tsx`** — In the sub-event card header (lines 567-583):
- Import `Switch` component and the new hook
- Fetch the competition's current `active_scoring_sub_event_id` via a query on the `competitions` table
- Add a `Switch` toggle between the status badge and the Select/Close button
- Toggle ON: calls `set_active_scoring(compId, level.id, se.id)`
- Toggle OFF: calls `set_active_scoring(compId, null, null)`
- Show the switch as checked when `active_scoring_sub_event_id === se.id`
- Remove the `<Zap>` icon from the Select/Close button

### Files changed
- Database migration (new RPC function)
- `src/hooks/useCompetitions.ts` — new `useSetActiveScoring` hook
- `src/pages/TabulatorDashboard.tsx` — toggle + button icon removal

