

## Plan: Reorganize Schedule Tab — Modal for Sub-Events + Move Voting Toggle

### Changes

**1. `src/components/competition/LevelsManager.tsx`**
- Replace the inline sub-event form (inputs at bottom of each level) with an **"Add Sub-Event" button** at the top of each level's collapsible content
- Clicking the button opens a **Dialog modal** with fields: Name, Location, Date, Start Time, End Time, and a **People's Choice Voting toggle** (using Switch)
- On submit, call `useCreateSubEvent` (updated to accept `voting_enabled`) and close the modal
- The existing sub-event list display remains as-is

**2. `src/hooks/useCompetitions.ts`**
- Add `voting_enabled?: boolean` to the `useCreateSubEvent` mutation's input type so the toggle value gets persisted to the `sub_events` table (which already has a `voting_enabled` column)

**3. `src/pages/CompetitionDetail.tsx`**
- Remove the "People's Choice Voting" toggle from the General tab (the `Switch` block around lines 160-166)
- Remove `votingEnabled` state and its reference in `handleSave`
- The `voting_enabled` field on the `competitions` table becomes unused in favor of per-sub-event control

### No database changes needed
- `sub_events` already has a `voting_enabled` boolean column

