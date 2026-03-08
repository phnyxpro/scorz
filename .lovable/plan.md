

## Broken Links, Unbuilt Pages & Bad Redirects — Audit

### Issues Found

**1. `/events` — Dead link (no route exists)**
- **Where used**: `Dashboard.tsx` (3 occurrences — contestant, audience, and generic empty states link to `/events`), `TicketSuccess.tsx` (2 occurrences — "Back to Events" buttons)
- **Fix**: Change all `/events` links to `/public-events` (which is the actual route serving the public events listing)

**2. `/admin` — Dead link (no route exists)**
- **Where used**: `AppLayout.tsx` (admin shield button navigates to `/admin`), `Competitions.tsx` (2 occurrences — "Subscribe now" and "Purchase more" links)
- **Fix**: Change `/admin` to `/admin/billing` in `Competitions.tsx` (subscription context) and `/admin/users` in `AppLayout.tsx` (general admin landing)

**3. `WitnessDashboard` — Page exists but has no route**
- `src/pages/WitnessDashboard.tsx` is built but never registered in `App.tsx`
- **Fix**: Add route `/competitions/:id/witness` pointing to `WitnessDashboard`

**4. `AdminPanel.tsx` — Page exists but has no route**
- `src/pages/AdminPanel.tsx` exists but is not imported or routed in `App.tsx`
- **Fix**: Either add a route (e.g., `/admin`) or remove the dead page if functionality is covered by the split admin pages (`AdminUsers`, `AdminSettings`, `AdminBilling`, `AdminLogs`)

### Summary of Changes

| File | Change |
|---|---|
| `src/pages/Dashboard.tsx` | Replace 3x `to="/events"` → `to="/public-events"` |
| `src/pages/TicketSuccess.tsx` | Replace 2x `to="/events"` → `to="/public-events"` |
| `src/components/AppLayout.tsx` | Change `navigate("/admin")` → `navigate("/admin/users")` |
| `src/pages/Competitions.tsx` | Change 2x `to="/admin"` → `to="/admin/billing"` |
| `src/App.tsx` | Add lazy import for `WitnessDashboard` and route `/competitions/:id/witness` |
| `src/pages/AdminPanel.tsx` | Remove file (dead code; split admin pages cover all functionality) |

### Files Modified
- `src/pages/Dashboard.tsx`
- `src/pages/TicketSuccess.tsx`
- `src/components/AppLayout.tsx`
- `src/pages/Competitions.tsx`
- `src/App.tsx`
- Delete `src/pages/AdminPanel.tsx`

