

## Problem

The `RegistrationSettingsPanel` component has no backing database columns. The toggle and date fields are local state only — the save button performs a no-op update. The public event page always shows the "Register as Contestant" button when the competition is `active`, with no way to hide it.

## Plan

### 1. Add registration columns to the `competitions` table

Run a migration to add three columns:

```sql
ALTER TABLE public.competitions
  ADD COLUMN registration_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN registration_start_at timestamptz,
  ADD COLUMN registration_end_at timestamptz;
```

### 2. Update `RegistrationSettingsPanel` to persist settings

- On load, populate state from `competition.registration_enabled`, `registration_start_at`, `registration_end_at`
- On save, update those three columns via `.update()` on the `competitions` table
- Remove the no-op comment and the fake `description: undefined` hack

### 3. Hide the Register button on the public page when registration is closed

In `PublicEventDetail.tsx`, change the condition around the Register button from:

```tsx
{comp.status === "active" && ( <Button>Register</Button> )}
```

to:

```tsx
{comp.status === "active" && comp.registration_enabled &&
  (!comp.registration_start_at || new Date() >= new Date(comp.registration_start_at)) &&
  (!comp.registration_end_at || new Date() <= new Date(comp.registration_end_at)) && (
  <Button>Register</Button>
)}
```

### 4. Also guard the registration form page

In `ContestantRegistration.tsx`, check the same conditions and show a "Registration is closed" message if the window has passed or registration is disabled.

### Technical Notes

- The `competitions` table is already managed by admins/organizers via RLS — no new policies needed
- The `types.ts` file will auto-regenerate after the migration, making the new columns available in TypeScript
- Existing competitions default to `registration_enabled = true`, so nothing breaks

