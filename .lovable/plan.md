

# Fix: Active Scoring Control and Judge Card Sections

## Root Cause

The database schema is missing columns that the UI components rely on. The code uses `as any` type casts to bypass TypeScript, but the actual database columns don't exist, so all updates silently fail.

**Missing from `competitions` table:**
- `active_scoring_level_id` (UUID, nullable, FK to `competition_levels`)
- `active_scoring_sub_event_id` (UUID, nullable, FK to `sub_events`)

**Missing from `sub_events` table:**
- `timer_visible` (boolean, default true)
- `comments_visible` (boolean, default true)

## Plan

### 1. Database migration — add missing columns

Single migration adding all four columns:

```sql
ALTER TABLE public.competitions
  ADD COLUMN active_scoring_level_id UUID REFERENCES public.competition_levels(id) ON DELETE SET NULL,
  ADD COLUMN active_scoring_sub_event_id UUID REFERENCES public.sub_events(id) ON DELETE SET NULL;

ALTER TABLE public.sub_events
  ADD COLUMN timer_visible BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN comments_visible BOOLEAN NOT NULL DEFAULT true;
```

### 2. Remove `as any` casts in code

Once the types regenerate with the new columns, remove the `as any` casts in:
- `ScoringSettingsManager.tsx` (lines updating `timer_visible` / `comments_visible`)
- `useCompetitions.ts` (line 255-258, updating `active_scoring_level_id` / `active_scoring_sub_event_id`)
- `CompetitionDetail.tsx` (where `comp?.active_scoring_level_id` is accessed — ensure the `Competition` interface in `useCompetitions.ts` already has these optional fields, which it does)

### 3. Fix forwardRef warning

The console warning "Function components cannot be given refs" is from Radix TabsContent trying to forward a ref to `ScoringSettingsManager`. This is a non-breaking warning but can be silenced by wrapping it in a `<div>` inside `TabsContent`, which is already the pattern for other tabs. The current scoring tab content at lines 498-507 just needs a wrapper div.

### Files changed
- **Migration SQL** — add 4 columns
- `src/components/competition/ScoringSettingsManager.tsx` — remove `as any` casts
- `src/hooks/useCompetitions.ts` — remove `as any` cast on active scoring update
- `src/pages/CompetitionDetail.tsx` — wrap scoring tab content in a `<div>`

