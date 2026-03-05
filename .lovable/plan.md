

## Plan: Per-Sub-Event Voting Toggle

### Problem
Currently `voting_enabled` is a single boolean on the `competitions` table, toggling voting for all sub-events at once. The organizer needs granular control to activate/deactivate voting per individual sub-event.

### Changes

**1. Database Migration**
- Add `voting_enabled boolean NOT NULL DEFAULT false` column to `sub_events` table.

**2. Update `src/pages/PeoplesChoiceManager.tsx`**
- Remove the competition-level voting toggle.
- Add a `Switch` toggle inside each `SubEventVoteCard` that updates `sub_events.voting_enabled` for that specific sub-event.
- Show active/inactive badge per card.

**3. Update `src/pages/AudienceVoting.tsx`**
- Before showing the voting form, check the selected sub-event's `voting_enabled` status. If false, show a "Voting is not open" message instead of the form.
- Fetch `voting_enabled` from the sub-event data (already available via `useSubEvents` which selects `*`).

**4. Keep `competitions.voting_enabled` as-is** (no removal) for backward compatibility, but the audience voting page will check the sub-event level flag instead.

### Files Changed
- **Migration**: Add `voting_enabled` to `sub_events`
- **Modified**: `src/pages/PeoplesChoiceManager.tsx` -- per-card toggle
- **Modified**: `src/pages/AudienceVoting.tsx` -- check sub-event voting status

