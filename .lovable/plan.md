

## Plan: Tabulator Dashboard UI Improvements

Three changes across three areas: Performance Timer contestant layout, Score Summary pagination, Side-by-Side dropdown, and Contestant accordion pagination.

### 1. TabulatorTimer — Horizontal scrollable columns layout
**File: `src/components/scoring/TabulatorTimer.tsx`** (lines 284-317)

Replace the vertical contestant list with a horizontally scrollable grid:
- Display contestants in a CSS grid with 5 columns (`grid-cols-5`)
- Wrap in a container with left/right `ChevronLeft`/`ChevronRight` arrow buttons
- Track a `page` state; each page shows 5 contestants
- On mobile, reduce to 2-3 columns with responsive classes (`grid-cols-2 sm:grid-cols-3 md:grid-cols-5`)
- Keep drag-and-drop and click-to-select behavior intact
- Arrow buttons disabled at boundaries

### 2. ScoreSummaryTable — Paginate 5 at a time
**File: `src/components/tabulator/ScoreSummaryTable.tsx`**

- Add `page` state, slice `rows` to show 5 per page
- Add prev/next pagination controls below the table
- Show "Page X of Y" indicator

### 3. Side-by-Side Detail — Contestant dropdown selector
**File: `src/pages/TabulatorDashboard.tsx`** (lines 273-290)

Replace the loop of all contestant cards with:
- A `Select` dropdown listing all contestants with scores
- State `selectedDetailRegId` to track selection
- Render only the selected contestant's `SideBySideScores` card

### 4. Contestant accordion in sub-event cards — Paginate 5 at a time
**File: `src/pages/TabulatorDashboard.tsx`** (lines 653-718)

- Add pagination state per sub-event for the contestants table
- Show 5 contestants at a time with prev/next controls
- Keep existing expand/collapse accordion behavior

### Files touched
| File | Change |
|------|--------|
| `src/components/scoring/TabulatorTimer.tsx` | Horizontal paginated grid with arrows |
| `src/components/tabulator/ScoreSummaryTable.tsx` | 5-per-page pagination |
| `src/pages/TabulatorDashboard.tsx` | Dropdown for side-by-side, paginate contestant accordion |

