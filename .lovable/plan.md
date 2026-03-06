

## Mobile Responsiveness Improvements

After reviewing all major pages and components, here are the specific mobile issues and fixes needed, organized by priority.

---

### Issues Found

**1. CheckInHub — Table not scrollable on mobile**
The tickets table has 6 columns with no horizontal scroll wrapper. On 390px screens, columns get crushed.
- Fix: Wrap the table in `overflow-x-auto` and add responsive card-style stats grid.

**2. CheckInHub — Stats grid uses `grid-cols-3` always**
The 3-column stat cards don't stack on very narrow screens.
- Fix: Change to `grid-cols-1 sm:grid-cols-3`.

**3. CompetitionDetail — Tab overflow**
10 tabs in a row with `flex` but no explicit horizontal scroll on small screens. `TabsList` uses `w-full flex overflow-x-auto no-scrollbar` which is good, but the tabs don't have `min-w-0` and can compress text.
- Fix: Already using `flex-shrink-0` — this is mostly fine. Add `gap-1` for breathing room.

**4. PublicEventDetail — Tab bar text hidden on small screens**
7 tabs with icons + text. On 390px, tabs compress badly.
- Fix: Hide tab text on mobile, show only icons. Add `sm:inline` to text spans.

**5. Results — Leaderboard table not mobile-friendly**
The results table has Rank + Name + N rubric columns + Judges + Final = potentially 8+ columns with no card fallback.
- Fix: Already has `overflow-x-auto` — acceptable. Add `min-w-[600px]` to the table for consistent behavior.

**6. Results — Header buttons overflow on mobile**
"My Feedback" + Print buttons in the header can wrap awkwardly.
- Fix: Stack vertically on mobile with `flex-col sm:flex-row`.

**7. AppLayout — Header actions cramped on mobile**
Role badges are hidden on mobile (good), but the remaining 3-4 icon buttons still crowd the header on 390px.
- Fix: This is already well-handled with `hidden sm:inline-flex` on the settings button. No change needed.

**8. Auth page — Demo accounts section cramped**
The demo account email addresses are truncated on mobile. The role badges + email + copy icon compete for space.
- Fix: Stack badge above email on mobile using `flex-col sm:flex-row`.

**9. Dashboard — Stat grid goes to 6 columns on large screens but 2 on mobile**
Already using `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` — this is correct.

**10. PublicEventDetail — Ticket form sub-event cards**
The sub-event cards use `flex-col sm:flex-row` — already responsive. Good.

**11. ContestantRegistration — Step indicator overflow**
The step pills use `overflow-x-auto` with `shrink-0` — already scrollable. Good.

**12. CheckInHub — Scan form button text**
"Check In" button with icon can be tight on mobile.
- Fix: Hide text on mobile, show icon only.

---

### Implementation Plan

| File | Change |
|------|--------|
| `src/pages/CheckInHub.tsx` | Wrap table in `overflow-x-auto`, change stats to `grid-cols-1 sm:grid-cols-3`, responsive scan button |
| `src/pages/PublicEventDetail.tsx` | Icon-only tabs on mobile (hide text below `sm`), tighter tab padding |
| `src/pages/Results.tsx` | Add `min-w-[600px]` to results table, stack header buttons on mobile |
| `src/pages/Auth.tsx` | Stack demo account row items on smallest screens |

These are focused, surgical fixes — no architectural changes. The app is already well-built for mobile with `sm:` breakpoints, `flex-wrap`, `overflow-x-auto`, and the bottom nav. These fixes address the remaining edge cases where content overflows or compresses on 390px viewports.

