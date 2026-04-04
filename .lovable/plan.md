

# Plan: Configure Judge Scorecards for Category Structures

## Problem
Category-type levels (like SPARK's "Semifinal Round" and "Grand Finale") have no sub-events. The judge scoring page requires a `sub_event_id` to:
- List contestants in the sidebar
- Store/retrieve scores (`judge_scores.sub_event_id` is NOT NULL)
- Assign judges via `sub_event_assignments`

Additionally, video links (stored in `custom_field_values.cf_1774992869708` — "Link to Performance") should render above the timer on the scorecard.

## Steps

### 1. Create synthetic sub-events for category-type levels (DB migration)
For each category-type level that has no sub-events, create a single "umbrella" sub-event automatically. This ensures the scoring infrastructure works without architectural changes.

- Create sub-events for the two SPARK levels:
  - "Semifinal Round" → sub-event named "Semifinal Round"
  - "Grand Finale" → sub-event named "Grand Finale"

### 2. Update JudgeScoring page for category-type levels
In `src/pages/JudgeScoring.tsx`:

- **Auto-select logic**: When `active_scoring_level_id` is set but `active_scoring_sub_event_id` is null (category type), fetch the umbrella sub-event for that level and auto-select it
- **Hide sub-event selector**: When the selected level has `structure_type === "categories"`, hide the Sub-Event dropdown since there's only one synthetic sub-event
- **Show contestant list**: Allow the contestant list to appear when the level is selected (even without explicit sub-event selection) by auto-setting the synthetic sub-event ID
- **Filter contestants**: For category levels, show all approved contestants for the competition (since registrations have `sub_event_id = NULL`), update the filter to also include contestants where `sub_event_id` is null when using a category-type level

### 3. Add video player above timer
In `src/pages/JudgeScoring.tsx`:

- After selecting a contestant, check `custom_field_values` for URL fields marked `show_on_scorecard` (specifically `cf_1774992869708`)
- Render an embedded video player or clickable video link **above** the `ReadOnlyTimer` component
- Auto-detect YouTube/Vimeo URLs and render appropriate embeds; for other URLs, show a styled link with a play icon
- Remove URL-type fields from the `ContestantInfoCard` accordion so they don't duplicate

### 4. Update ContestantInfoCard to exclude video URLs
In `src/components/shared/ContestantInfoCard.tsx`:

- Filter out fields with `field_type === "url"` from the profile details accordion (since they're now rendered as video embeds above the timer)

### 5. Update contestant filtering for null sub_event_id
In the `filteredContestants` memo in `JudgeScoring.tsx`:

- When the selected level is category-type, include contestants with `sub_event_id === null` that belong to the competition

### 6. Update registrations to link to synthetic sub-events
Run a data migration to set `sub_event_id` on the 56 SPARK registrations to point to the Semifinal Round's new synthetic sub-event, so the existing scoring queries work correctly.

## Technical Details

**New sub-event creation (migration SQL):**
```sql
INSERT INTO sub_events (name, level_id, status)
VALUES
  ('Semifinal Round', '3b8c9863-6938-432c-907e-2b0722e28e13', 'scheduled'),
  ('Grand Finale', '80f4be19-9955-456b-89e5-75ec6be50b69', 'scheduled');
```

Then update registrations:
```sql
UPDATE contestant_registrations
SET sub_event_id = (SELECT id FROM sub_events WHERE level_id = '3b8c9863-6938-432c-907e-2b0722e28e13' LIMIT 1)
WHERE competition_id = '3a212bca-40f7-481f-ab67-9ce5e5223eb5'
AND sub_event_id IS NULL;
```

**Video embed component** — lightweight inline component that:
- Parses YouTube URLs → renders `<iframe>` embed
- Parses other URLs → renders styled link with play button
- Positioned between the header and the `ReadOnlyTimer`

**Files to modify:**
- `src/pages/JudgeScoring.tsx` — category-type handling, video embed, auto-select logic
- `src/components/shared/ContestantInfoCard.tsx` — exclude URL fields
- Database migration for synthetic sub-events + registration updates

