

# Level Settings for Category-Based Structure

## Problem
When a level uses categories instead of sub-events, there's no way to configure level-wide settings like location, date/time, People's Choice voting, time slots, or ticketing. These settings currently live on individual sub-event records, but with categories the sub-events are auto-generated from leaf nodes.

## Approach
Add a **Level Settings** card above the category tree in `CategoriesPanel` that configures shared settings for all leaf sub-events in that level. When a leaf category auto-creates its sub_event, it inherits these settings. Changes to these settings propagate to all linked sub_events.

## Changes

### 1. CategoriesPanel — Add Level Settings Card
Add a collapsible settings section at the top of `CategoriesPanel` with:
- **Location** — text input (venue/room)
- **Date** — date input; if the event spans multiple days, allow per-leaf override
- **Start/End Time** — time inputs
- **People's Choice toggle** — enables `voting_enabled` on all linked sub_events
- **Use Time Slots toggle** — enables/disables `use_time_slots` on linked sub_events
- **Ticketing** — selector: "No Ticket", "Free", "Paid", "External" with conditional fields (price, max tickets, external URL)

When any setting changes, bulk-update all sub_events linked to leaf categories in this level.

### 2. Leaf Sub-Event Creation
Update `useLinkSubEvent` to apply the level settings (location, date, time, voting, time slots, ticketing) when creating the sub_event for a leaf category.

### 3. Files Modified
| File | Change |
|------|--------|
| `src/components/competition/CategoriesPanel.tsx` | Add level settings card with all fields; update link mutation to apply settings; bulk-update existing sub_events on settings change |

### 4. No Database Changes
All fields already exist on the `sub_events` table. The ticketing options "no ticket" maps to `ticketing_type = 'none'` — but currently the column defaults to `'free'`. We add a migration to support `'none'` as a valid value (no constraint exists, so no schema change needed — just UI support).

### 5. Sub-Event Ticketing Options
Both sub-event and category modes get the same four options: **No Ticket**, **Free**, **Paid**, **External**. The SubEventsPanel form also gets the "No Ticket" option added.

