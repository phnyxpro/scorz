

## Plan: Replace Contestants Card, Add Registrations + Contestant Profiles + Results Action Cards

### Current State
- Dashboard has a "Contestants" card for organizers that links to `/competitions` (generic)
- `CompetitionContestants` page exists at `/competitions/:id/contestants` showing approved contestant cards
- `RegistrationsManager` component exists inside `CompetitionDetail` page
- `Results` page exists at `/competitions/:id/results` with level/sub-event selectors

### Changes

**1. Update `src/lib/navigation.ts`** -- Replace the "Contestants" card with three new organizer cards:
- "Registrations" -- links to `/registrations` (new page)
- "Contestant Profiles" -- links to `/contestant-profiles` (new page)
- "Results" -- links to `/results` (new page)

**2. Create `src/pages/RegistrationsHub.tsx`** -- Competition selector at top, then renders `RegistrationsManager` for the selected competition. Back button to dashboard.

**3. Create `src/pages/ContestantProfilesHub.tsx`** -- Competition selector at top, then shows approved contestants grid (reuse logic from `CompetitionContestants`). Clicking a contestant links to `/profile/:userId`.

**4. Create `src/pages/ResultsHub.tsx`** -- Competition selector at top, then renders the results/leaderboard view (reuse logic from existing `Results.tsx`). Essentially wraps Results with a competition picker instead of requiring `:id` in URL.

**5. Update `src/App.tsx`** -- Add routes for `/registrations`, `/contestant-profiles`, `/results-hub`. Keep existing `/competitions/:id/results` and `/competitions/:id/contestants` routes intact.

### Files

| File | Action |
|------|--------|
| `src/pages/RegistrationsHub.tsx` | Create -- competition selector + RegistrationsManager |
| `src/pages/ContestantProfilesHub.tsx` | Create -- competition selector + contestant grid |
| `src/pages/ResultsHub.tsx` | Create -- competition selector + results view |
| `src/lib/navigation.ts` | Replace "Contestants" card with 3 new cards |
| `src/App.tsx` | Add 3 new routes |

