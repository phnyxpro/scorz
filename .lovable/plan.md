

## Plan: Add "Tickets" Action Card and Hub Page for Organizers

### Overview
Create a new "Tickets" hub page following the same pattern as Registrations/Contestant Profiles/Results. The organizer selects a competition, then sees all ticket purchases with purchaser details, ticket codes (with QR/barcode display), ticket type, and check-in status.

### Changes

**1. `src/lib/navigation.ts`** -- Add a "Tickets" dashboard card for organizer/admin roles, linking to `/tickets-hub`. Use the `Ticket` icon (from lucide-react). Place it near the existing ticket-related cards.

**2. Create `src/pages/TicketsHub.tsx`** -- New hub page with:
- Competition selector dropdown at top (same pattern as other hubs)
- Summary stats cards: Total Tickets, Checked In, Pending, Revenue (based on ticket_price from sub_events)
- Full tickets table with columns: Ticket #, QR Code (rendered inline as a small QR image using a lightweight QR library), Purchaser Name, Email, Phone, Sub-Event, Ticket Type, Price, Check-In Status, Purchase Date
- Search/filter input to find tickets by name, email, or ticket number
- Each ticket number displayed in monospace with a small inline QR code generated client-side

**3. `src/App.tsx`** -- Add route `/tickets-hub` → `TicketsHub` within AppLayout + ProtectedRoute.

**4. QR Code rendering** -- Use a lightweight library (`qrcode.react` or similar) to render small QR codes inline for each ticket number. This gives organizers a visual of what each patron's code looks like.

### Data Flow
- Select competition → fetch levels → fetch sub_event IDs → fetch `event_tickets` where `sub_event_id` in those IDs
- Join sub_event name for display; pull `ticket_price` and `ticket_type` from sub_events for revenue calc
- Reuses the same query pattern as `CheckInHub`

### Files

| File | Action |
|------|--------|
| `src/pages/TicketsHub.tsx` | Create -- competition selector + stats + searchable tickets table with QR codes |
| `src/lib/navigation.ts` | Add "Tickets" card for organizer/admin |
| `src/App.tsx` | Add `/tickets-hub` route |

