

## Plan: People's Choice Management Page for Organizers

### Problem
The "People's Choice" dashboard card links to `/competitions?tab=voting` which has no voting tab. Organizers need a dedicated page to activate audience voting per competition and monitor real-time vote statistics.

### Approach
Create a new `PeoplesChoiceManager` page at `/peoples-choice` that lets organizers:
- Select a competition and toggle `voting_enabled` on/off
- See real-time vote tallies per sub-event with bar charts
- View top-voted contestants and total vote counts
- Access the existing `VoteAudit` component for fraud detection

### Changes

**1. New page: `src/pages/PeoplesChoiceManager.tsx`**
- Competition selector dropdown (fetches organizer's competitions)
- Prominent toggle switch to enable/disable voting (updates `competitions.voting_enabled` in real-time)
- For each sub-event under the selected competition: display a card with live vote counts, percentage bars, and contestant rankings
- Uses `useVoteCounts` hook with 15s polling (already exists) for live tallies
- Expandable `VoteAudit` panel per sub-event for duplicate ticket detection and vote removal
- Summary stats at top: total votes, number of sub-events with votes, leading contestant

**2. Update `src/App.tsx`**
- Add route `/peoples-choice` pointing to the new page, wrapped in `ProtectedRoute` + `AppLayout`

**3. Update `src/lib/navigation.ts`**
- Change the People's Choice dashboard card `to` from `/competitions?tab=voting` to `/peoples-choice`

### No database changes required
The `voting_enabled` column and `audience_votes` table already exist. Real-time polling is handled by the existing `useVoteCounts` hook.

### Files Changed
- **New**: `src/pages/PeoplesChoiceManager.tsx`
- **Modified**: `src/App.tsx` — add route
- **Modified**: `src/lib/navigation.ts` — update card link

