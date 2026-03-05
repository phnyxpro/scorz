

## Plan: Categorize Dashboard Card Icons by Color

### Current State
All dashboard action cards use `text-primary` (charcoal) for their icons — no visual distinction between categories.

### Theme Colors Available
- **Green** (`text-secondary`) — HSL 174 60% 40% (teal-green)
- **Orange** (`text-accent`) — HSL 38 92% 50% (brand orange)

### Proposed Categories

| Category | Color | Cards |
|----------|-------|-------|
| **Finance & Sales** | Orange (`text-accent`) | Billing, Payments, Tickets, Ticket Check-In, My Tickets |
| **Competition & Operations** | Green (`text-secondary`) | My Competitions, Judging Hub, Registrations, Contestant Profiles, Results, Tabulator Dashboard, People's Choice (both), My Profile, Events, News & Updates |
| **Admin / Platform** | Orange (`text-accent`) | User Management, Global Settings |

### Changes

**Single file**: `src/lib/navigation.ts` — update the `color` field on each card in the `dashboardCards` array.

**Also**: `src/pages/Dashboard.tsx` — update the judge-specific cards built by `buildJudgeCards()` to use `text-secondary` instead of `text-primary`.

