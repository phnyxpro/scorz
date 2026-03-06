

## Unified Tabulator Dashboard

### Current State
The tabulator experience is fragmented across three views:
1. **Dashboard** -- shows `JudgingHubContent` (competition table, levels, judges, contestants with expandable scorecards) plus a "Tabulator Dashboard" button in the header
2. **TabulatorDashboard** (`/competitions/:id/tabulator`) -- requires navigating to a specific competition first, then selecting level/sub-event to access timer, score summary, side-by-side detail, vote audit, certification, and chat
3. **WitnessDashboard** -- still exists separately but witness role is now merged into tabulator

Tabulators currently bounce between the Dashboard (to see the overview) and the Tabulator Dashboard (to use tools). The goal is one unified page.

### Plan

**Rebuild `src/pages/TabulatorDashboard.tsx`** into a single cohesive dashboard that combines everything:

1. **Top section -- Competition selector** (from JudgingHub pattern): searchable competition table showing active/completed competitions. Clicking a competition loads the overview.

2. **Level tabs + Sub-event cards** (from JudgingHub): tabbed levels with sub-event cards showing judges, contestants, status. Each sub-event card gets a "Select" button to activate it as the working sub-event.

3. **Active sub-event workspace** (when a sub-event is selected): a prominent panel below the overview containing:
   - Active Scoring Manager banner
   - Certification chain badges (Chief Judge, Tabulator)
   - Performance Timer (prominent, with spacebar hint)
   - Scoring Progress bar + Judge Activity indicator
   - Tabbed content: Score Summary | Side-by-Side Detail | Vote Audit
   - Physical match verification + certification controls
   - Production Chat (collapsible)

4. **Certify dialog** -- unchanged

**Update `src/pages/Dashboard.tsx`**: For tabulators, instead of showing `JudgingHubContent`, show a simple welcome message with a prominent link to the unified Tabulator Dashboard. Remove the separate "Tabulator Dashboard" button from the header since the dashboard itself will redirect tabulators.

**Update route in `src/App.tsx`**: Add a `/tabulator` route that renders the unified `TabulatorDashboard` (no competition ID required -- the competition selector is built in). Keep the `/competitions/:id/tabulator` route as well for direct linking.

**Remove `src/pages/WitnessDashboard.tsx`** references from routes since witness is merged into tabulator.

### Technical Approach

- Extract `useJudgingOverview` from JudgingHub into a shared hook or import it directly (it's already exported)
- The unified page will manage two layers of state: competition selection (top) and sub-event selection (workspace)
- When a sub-event is clicked from the overview cards, it auto-populates the workspace section
- All existing hooks (realtime subscriptions, certification, scores) remain unchanged
- The page will be self-contained -- no need to navigate to a separate competition first

### Files Changed
- `src/pages/TabulatorDashboard.tsx` -- major rewrite to unify all features
- `src/pages/Dashboard.tsx` -- simplify tabulator section
- `src/App.tsx` -- update `/tabulator` route to render unified dashboard directly

