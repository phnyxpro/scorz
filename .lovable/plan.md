

## Plan: Extend Slots Tab with Order of Performers and Randomized Draw

### Current State
The SlotsManager generates time slots for sub-events. Slots have `slot_index`, `start_time`, `end_time`, `is_booked`, and `contestant_registration_id`. Currently, the table only shows time and booked status -- it doesn't show **who** is assigned to each slot or allow organizers to manage the performance order.

### What to Build

**1. Show performer names in the slots table**
- Join `performance_slots` with `contestant_registrations` to display the contestant's name next to booked slots
- Add a "Performer" column to the table showing the contestant name (linked to profile)

**2. Add "Order of Performance" section**
- Below the time slots generator, add a second card: "Order of Performance"
- Fetch all approved `contestant_registrations` for the selected sub-event
- Display them in a numbered list ordered by `sort_order`
- Allow manual reordering (move up/down buttons)

**3. Randomized Draw button**
- Add a "Randomize Draw" button that shuffles all approved contestants for the sub-event
- Updates `sort_order` on each `contestant_registration` with the randomized index
- Shows a confirmation dialog before randomizing (since it overwrites existing order)
- After randomization, optionally auto-assign contestants to slots in order

### Changes

| File | Change |
|------|--------|
| `src/components/competition/SlotsManager.tsx` | Add performer column to slots table; add "Order of Performance" card with contestant list, move up/down, and "Randomize Draw" button; fetch contestant registrations for selected sub-event; implement shuffle + bulk update of `sort_order` |

### No database changes needed
- `contestant_registrations` already has a `sort_order` column
- `performance_slots` already has `contestant_registration_id` for linking

### UI Layout

```text
┌─────────────────────────────────────────────┐
│  Performance Time Slots (existing card)     │
│  [Level ▼] [Sub-Event ▼]                   │
│  [Generate slots form...]                   │
│  # | Time           | Performer  | Status   │
│  1 | 9:00–9:05 AM   | Jane Doe   | Booked   │
│  2 | 9:05–9:10 AM   |            | Available│
├─────────────────────────────────────────────┤
│  Order of Performance                       │
│  [Randomize Draw 🎲] [Assign to Slots]      │
│  # | Contestant    | ↑ ↓                    │
│  1 | Jane Doe      | ↑ ↓                    │
│  2 | John Smith    | ↑ ↓                    │
│  3 | Alice Johnson | ↑ ↓                    │
└─────────────────────────────────────────────┘
```

