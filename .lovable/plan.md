

## Plan: Contestant Profile Page with Status Actions

### What We're Building
A competition-scoped contestant profile page accessible when "Profile" is clicked from the Contestant Details sheet. It will include "No Show", "Disqualified", and "Drop Out" status buttons that update the registration status and delete associated judge scores and tabulator data.

### Route & Navigation
- New route: `/competitions/:id/contestant/:registrationId`
- Update the "Profile" button in `ContestantDetailSheet.tsx` to link to this new route instead of `/profile/:userId`
- New page: `src/pages/ContestantRegistrationProfile.tsx`

### Page Layout
- Back button returning to competition
- Hero section: avatar, name, status badge, age category, competition name
- Contact info section (email, phone, location)
- Bio, social handles, media gallery, compliance/signatures
- **Status Actions Card** with three destructive buttons:
  - **No Show** — sets status to `no_show`
  - **Disqualified** — sets status to `disqualified`  
  - **Drop Out** — sets status to `dropped_out`
- Each button requires confirmation via AlertDialog
- Only visible to admin/organizer roles

### Backend: Status Change Logic
- Create a database function `withdraw_contestant` (security definer) that:
  1. Updates `contestant_registrations.status` to the new status
  2. Deletes all `judge_scores` for that `contestant_registration_id`
  3. Deletes all `performance_durations` for that `contestant_registration_id`
  4. Deletes all `performance_timer_events` for that `contestant_registration_id`
  5. Deletes all `audience_votes` for that `contestant_registration_id`
  6. Deletes associated `performance_slots` assignments
- The function checks the caller has admin/organizer role

### Files to Create/Edit
1. **New migration** — `withdraw_contestant` RPC function
2. **New file** `src/pages/ContestantRegistrationProfile.tsx` — the profile page
3. **Edit** `src/App.tsx` — add route
4. **Edit** `src/components/competition/ContestantDetailSheet.tsx` — update Profile link to include competition context

### Technical Details
- The page fetches registration by ID, competition details, media files
- Status buttons call the `withdraw_contestant` RPC then invalidate queries
- New statuses (`no_show`, `disqualified`, `dropped_out`) added to `statusColor` maps
- A "Reinstate" button appears for withdrawn contestants to set status back to `approved`

