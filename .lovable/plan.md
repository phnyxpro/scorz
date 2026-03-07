

## Quick Links to Assigned Sub-Events on Judge Dashboard

### What
Add a horizontal row of quick-link chips/badges above the dashboard action cards for judges. Each chip represents an assigned sub-event within the selected competition, linking directly to the scoring page with that sub-event pre-selected. The currently active scoring sub-event (set by the organizer via `competitions.active_scoring_sub_event_id`) is highlighted with a visual indicator.

### How

**File: `src/pages/Dashboard.tsx`**

1. After the competition is selected (`selectedCompId`), fetch the judge's assigned sub-events for that competition:
   - Query `sub_event_assignments` filtered by `effectiveUserId` + join through `sub_events` → `competition_levels` to filter by `selectedCompId`
   - Also fetch the competition's `active_scoring_level_id` and `active_scoring_sub_event_id` from the `competitions` table (already available if we query it)

2. Fetch competition record for `selectedCompId` to get `active_scoring_sub_event_id`

3. Render a new section between the "select competition" prompt and the action cards grid:
   - Row of pill/badge links: `Level Name → Sub-Event Name`
   - Each links to `/competitions/${selectedCompId}/score?subEvent=${subEventId}`
   - If `subEvent.id === active_scoring_sub_event_id`, show a green dot / "LIVE" badge
   - Use existing `Badge` component with variant styling

4. Data flow:
   - Reuse `useStaffView()` which already returns `subEventDetails` with nested level data and `myAssignments`
   - Filter `subEventDetails` to those belonging to the selected competition
   - Query competition's `active_scoring_sub_event_id` via a small `useQuery` on `competitions` table filtered to `selectedCompId`

### Files changed
- `src/pages/Dashboard.tsx` — add sub-event quick links section with active indicator

