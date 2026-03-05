

## Plan: Add Ticket Check-In Hub for Organizers

### Overview
Add a "Ticket Check-In" action card on the organizer dashboard that links to a new hub page. The hub follows the same pattern as Registrations/Contestant Profiles/Results: select a competition first, then see all tickets for that competition's sub-events with the ability to check patrons in by scanning/entering their ticket barcode.

### Changes

**1. `src/lib/navigation.ts`** -- Add a new organizer dashboard card:
- "Ticket Check-In", desc: "Check in patrons at events", icon: `Ticket`, to: `/check-in`, roles: `["organizer", "admin"]`

**2. Create `src/pages/CheckInHub.tsx`** -- New hub page with:
- Competition selector dropdown (fetches organizer's competitions via `useCompetitions`)
- Once selected, fetches all `event_tickets` joined with `sub_events` for that competition
- Search/scan input field at the top for entering a ticket number (barcode value)
- When a ticket number is entered/scanned, it finds the matching ticket and marks it as checked in (`is_checked_in = true`, `checked_in_at = now()`) via a Supabase update
- Shows a table of all tickets grouped or filterable by sub-event, with columns: Ticket #, Name, Email, Sub-Event, Type, Status (Checked In / Pending)
- Quick visual feedback (green flash / toast) on successful check-in
- Stats summary at top: total tickets, checked in count, pending count

**3. `src/App.tsx`** -- Add route `/check-in` → `CheckInHub` within `AppLayout` + `ProtectedRoute`

### Files

| File | Action |
|------|--------|
| `src/pages/CheckInHub.tsx` | Create -- competition selector + ticket search/scan + check-in table |
| `src/lib/navigation.ts` | Add "Ticket Check-In" card for organizer/admin |
| `src/App.tsx` | Add `/check-in` route |

