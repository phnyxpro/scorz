

## Evaluation: Platform Admin Dashboard

### Current State

The admin experience is split across:
- **Dashboard** (`/dashboard`) — 4 KPI cards (Users, Competitions, Active Events, Registrations), 30-day trend charts (registrations & scoring), quick access to recent competitions, activity feed, and action cards linking to sub-pages
- **User Management** (`/admin/users`) — searchable user table with role management dialog and masquerade
- **Global Settings** (`/admin/settings`) — branding, registration defaults, email notifications, feature flags, demo data seeding
- **Audit Logs** (`/admin/logs`) — ActivityFeed component with 200-item limit, realtime updates
- **Billing** (`/admin/billing`) — credit-based tier cards with Stripe checkout, credits summary
- **Analytics** (`/analytics`) — competition-filterable charts (registrations, scores, status pie, age categories)
- **Finance** (`/finance`) — revenue metrics with hardcoded placeholder stats ("Active Events: +12", "Conversion Rate: 89%", "+20.1% from last month")

### Issues Found

1. **Finance Dashboard has hardcoded fake metrics** — "Active Events: +12", "Conversion Rate: 89%", "+20.1% from last month" are static strings, not computed from data. This is misleading.

2. **Finance Dashboard references non-existent `registration_fee` column** — `competitions` table has no `registration_fee` field, so `totalRevenue` is always $0. The finance page queries a column that doesn't exist, silently failing.

3. **Activity Feed limited event types** — Only maps icons for 5 event types (`scores_certified`, `chief_certified`, `tabulator_certified`, `witness_certified`, `notification_sent`). Other logged events (registrations, staff logins, etc.) get a generic icon. Should cover more event types.

4. **Audit Logs page is bare** — No filtering by event type, competition, date range, or actor. Just a long scrollable list. For 200+ entries this becomes unusable.

5. **No admin notification/alert system on dashboard** — No pending items panel (e.g., pending registrations count, uncertified sub-events, recent errors). Admins have to navigate to each section to discover issues.

6. **Analytics and Dashboard charts overlap** — Both the Dashboard and Analytics page show registration trends independently with different implementations, creating redundancy.

7. **User Management lacks pagination** — Fetches all profiles at once. Will degrade with scale.

8. **No export capability on admin pages** — Users table, audit logs, and analytics have no CSV/Excel export option.

### Recommended Improvements

**Priority 1 — Fix Finance Dashboard (broken)**
- Remove hardcoded placeholder metrics
- Replace `registration_fee` query with actual ticket revenue from `event_tickets` (paid tickets) and `competition_credits` (credit purchases)
- Compute real "Active Events" count and remove fake percentage changes

**Priority 2 — Enhance Audit Logs**
- Add filters: event type dropdown, date range picker, competition selector, search by description
- Add pagination or infinite scroll
- Expand icon/color mapping to cover all logged event types (registration, staff login, etc.)

**Priority 3 — Admin Dashboard Alerts Panel**
- Add a "Needs Attention" section showing: pending registrations count, uncertified sub-events, recent failed edge function invocations
- Link each alert to the relevant management page

**Priority 4 — User Management Improvements**
- Add role filter dropdown (show only judges, only admins, etc.)
- Add pagination (20 users per page)
- Add CSV export of user list

**Priority 5 — Consolidate Analytics**
- Remove duplicate trend charts from Dashboard (keep the compact KPI cards)
- Make Analytics the single source for detailed charts
- Add ticket revenue chart to Analytics

### Proposed Implementation

| File | Change |
|---|---|
| `src/pages/FinanceDashboard.tsx` | Replace fake metrics with real queries against `event_tickets` and `competition_credits`; remove hardcoded strings |
| `src/pages/AdminLogs.tsx` | Add event type filter, date range picker, competition filter, search input |
| `src/components/shared/ActivityFeed.tsx` | Expand event type icon/color map; accept filter props |
| `src/pages/AdminUsers.tsx` | Add role filter dropdown and basic pagination |
| `src/pages/Dashboard.tsx` | Add "Needs Attention" alerts panel for admins |

### Files Modified
- `src/pages/FinanceDashboard.tsx`
- `src/pages/AdminLogs.tsx`
- `src/components/shared/ActivityFeed.tsx`
- `src/pages/AdminUsers.tsx`
- `src/pages/Dashboard.tsx`

