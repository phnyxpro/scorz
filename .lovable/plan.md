

## Plan: Enhanced Ticketing System with Payment Support

### Current State
- `sub_events` table has `ticketing_type` (default "free") and `ticket_price` columns, plus `max_tickets` -- but these fields are **never exposed** in the organizer UI for editing
- `AudienceTicketForm` always creates "free" tickets regardless of `ticketing_type`
- No paid ticket checkout flow exists (the existing `create-checkout` is for competition credits only)
- No support for linking to external ticketing platforms (Eventbrite, etc.)
- The `LevelsManager` sub-event form only manages name, location, date, time, and voting -- no ticketing fields

### Changes

**1. Database: Add `external_ticket_url` column to `sub_events`**
- New nullable `text` column for linking to an external ticketing/payment page
- Migration only; no RLS changes needed (sub_events already has correct policies)

**2. Update Sub-Event Form in `LevelsManager.tsx`**
- Add ticketing configuration fields to the sub-event create/edit dialog:
  - **Ticketing Type** select: `free` | `paid` | `external`
  - **Ticket Price** input (shown when type is `paid`)
  - **Max Tickets** input (shown when type is `free` or `paid`)
  - **External URL** input (shown when type is `external`)
- Persist these fields on create and update

**3. Update `AudienceTicketForm` to handle all 3 modes**
- Accept `ticketingType`, `ticketPrice`, `maxTickets`, and `externalTicketUrl` as props
- **Free mode**: Current behavior (register and get ticket immediately)
- **Paid mode**: Collect user details, then redirect to a Stripe checkout session via a new `create-ticket-checkout` edge function. On return to success URL, the ticket is created
- **External mode**: Show an "Buy Ticket" button that opens `externalTicketUrl` in a new tab

**4. Create `create-ticket-checkout` Edge Function**
- New Stripe checkout session with `mode: "payment"` using a dynamic `price_data` (since ticket prices vary per event)
- Stores sub_event_id, full_name, email, phone in session metadata
- Success URL includes session_id for verification
- On success page load, a `verify-ticket-payment` edge function checks Stripe session status and creates the `event_tickets` row

**5. Create `verify-ticket-payment` Edge Function**
- Called from frontend after Stripe redirect
- Retrieves the Stripe session, confirms payment succeeded
- Inserts into `event_tickets` with `ticket_type: "paid"`
- Returns the ticket number to the frontend

**6. Update `PublicEventDetail.tsx`**
- Pass sub-event ticketing fields to `AudienceTicketForm`
- Query already fetches sub_events; just need to include `ticketing_type`, `ticket_price`, `max_tickets`, `external_ticket_url`

**7. Update `TicketsHub.tsx`**
- Store `payment_status` on tickets to distinguish confirmed paid vs pending
- Add `payment_status` column to `event_tickets` table (nullable text, default null for free tickets)

### Files Modified
- `supabase/migrations/` -- new migration (add `external_ticket_url` to sub_events, `payment_status` to event_tickets)
- `src/components/competition/LevelsManager.tsx` -- ticketing config in sub-event form
- `src/components/public/AudienceTicketForm.tsx` -- 3-mode ticket form
- `src/pages/PublicEventDetail.tsx` -- pass ticketing props
- `supabase/functions/create-ticket-checkout/index.ts` -- new edge function
- `supabase/functions/verify-ticket-payment/index.ts` -- new edge function
- `supabase/config.toml` -- register new functions

### Architecture
```text
Free:     Form -> Insert event_tickets -> Show ticket #
Paid:     Form -> create-ticket-checkout -> Stripe -> verify-ticket-payment -> Insert event_tickets
External: Form -> Open external URL in new tab
```

