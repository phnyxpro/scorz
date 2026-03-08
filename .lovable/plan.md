

## Plan: Special Entry Badge Selector in Registration Forms

### Summary
When an organizer adds a contestant to a level that has special entries configured (Previous Winners, Wild Cards, Sub-Competition Winners), show a badge selector in the Event Details step so the organizer can tag the contestant with a special entry type.

### Database Migration
Add a nullable column to `contestant_registrations`:
- `special_entry_type` (text, nullable) — stores the special entry type (e.g., `"previous_winner"`, `"wild_card"`, `"sub_competition_winner"`) or NULL for standard contestants.

### UI Changes

**`src/pages/ContestantRegistration.tsx` — `EventStep` component (line ~582)**:
- After the level is selected, look up `special_entries` from the selected level data.
- If the selected level has any special entries, render a badge selector section below the level picker: a set of toggle buttons (similar to the LevelsManager preset toggles) allowing the organizer to optionally tag this contestant as one of the special entry types, or leave unselected for a standard contestant.
- Add a `specialEntryType` field to the form schema and registration submission.

**`src/pages/ContestantRegistration.tsx` — `OnBehalfRegistrationForm` submit handler (line ~108)**:
- Pass `special_entry_type` from the form data to the `createReg.mutate()` call.

**`src/components/competition/RegistrationsManager.tsx` — Walk-in form (line ~736)**:
- Not required for walk-in since it's a quick form without level selection, but can be added later.

**`src/components/competition/RegistrationsManager.tsx` — Registration table display**:
- Show the special entry badge next to the contestant name in the table row (e.g., a small "Wild Card" or "Previous Winner" badge).

### Files Changed
- **Migration**: Add `special_entry_type` column to `contestant_registrations`
- **`src/pages/ContestantRegistration.tsx`**: Add `specialEntryType` to schema, render badge selector in EventStep, include in submission
- **`src/components/competition/RegistrationsManager.tsx`**: Display special entry badge in the table rows
- **`src/hooks/useRegistrations.ts`**: Add `special_entry_type` to `ContestantRegistration` interface

