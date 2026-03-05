

## Plan: Audience Dashboard Card Updates

### Changes

**1. Update `src/lib/navigation.ts`**
- Rename "Public Events" card (for audience) to "Events" and change link from `/public-events` to `/audience-events`
- Remove the "About" card (currently visible to all roles)
- Add new "My Tickets" card for audience role linking to `/my-tickets`, using `CreditCard` icon

**2. New page: `src/pages/AudienceEvents.tsx`**
- Embedded within the dashboard layout (AppLayout), fetches active/completed competitions same as PublicEvents but without the standalone header/footer
- Each event card links to `/events/:slug` (the public event detail page) but rendered inside the dashboard layout via a new wrapped route

**3. New page: `src/pages/MyTickets.tsx`**
- Fetches `event_tickets` for the current user (`user_id = auth.uid()`)
- Joins with `sub_events` and `competition_levels` -> `competitions` to show event name context
- Displays ticket number, event name, ticket type, check-in status, and purchase date
- Simple card/table layout grouped by competition

**4. Update `src/App.tsx`**
- Add `/audience-events` route (ProtectedRoute + AppLayout + AudienceEvents)
- Add `/my-tickets` route (ProtectedRoute + AppLayout + MyTickets)

### Files Changed
- **Modified**: `src/lib/navigation.ts` — rename card, remove About, add My Tickets
- **New**: `src/pages/AudienceEvents.tsx` — events list within dashboard
- **New**: `src/pages/MyTickets.tsx` — user's tickets and details
- **Modified**: `src/App.tsx` — two new routes

