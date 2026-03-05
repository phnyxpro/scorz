

## Plan: Public Voting + Role-Based People's Choice Access

### Problem
1. The public event page's Voting tab only links to an authenticated voting page -- audience should be able to vote directly from the public page without needing to log in.
2. The `/peoples-choice` manager page (with toggle controls and audit) is accessible to all authenticated users, but should be restricted to admins and organizers only.
3. The audience dashboard's People's Choice card should show a page where they can cast votes (if not yet voted) or see their existing votes per competition.

### Changes

**1. Add inline voting form to the public event page's Voting tab**
- **Modified**: `src/pages/PublicEventDetail.tsx`
- Replace the current "Go to Voting Page" button with an inline voting experience directly in the Voting tab.
- Show level/sub-event selector, contestant list, voter info form (name, email, phone, ticket number), and submit button.
- Show "already voted" confirmation if the email has already voted for that sub-event.
- Show the voting tab when ANY sub-event has `voting_enabled` (not just `competitions.voting_enabled`).
- No authentication required -- uses the existing `audience_votes` RLS which allows anonymous SELECT.
- Note: INSERT requires authentication, so unauthenticated users will be prompted to sign in before submitting.

**2. Restrict `/peoples-choice` manager to admin/organizer roles**
- **Modified**: `src/pages/PeoplesChoiceManager.tsx`
- Add role check at the top using `useAuth` and the user_roles table. If user is not admin/organizer, redirect to dashboard with a toast.

**3. Repurpose `/competitions/:id/vote` (AudienceVoting) for audience dashboard**
- **Modified**: `src/pages/AudienceVoting.tsx`
- Rework to show: for each sub-event where the user has voted, display their vote choice. For sub-events where voting is open and they haven't voted, show the voting form.
- Fetch all votes by the user's email across sub-events in the competition.

**4. Update navigation for audience role**
- **Modified**: `src/lib/navigation.ts`
- Change the People's Choice card for the `audience` role to link to `/competitions` (where they can navigate to vote) instead of `/peoples-choice` (which is admin/organizer only).
- Keep `/peoples-choice` link for `organizer` role only.

### Files Changed
- **Modified**: `src/pages/PublicEventDetail.tsx` -- inline voting form in Voting tab
- **Modified**: `src/pages/PeoplesChoiceManager.tsx` -- add admin/organizer role guard
- **Modified**: `src/pages/AudienceVoting.tsx` -- show existing votes + voting form
- **Modified**: `src/lib/navigation.ts` -- separate audience vs organizer People's Choice card links

