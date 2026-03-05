

## Plan: Embed Judging Hub as Tabulator Dashboard Content

### What Changes
When a user with the `tabulator` role lands on the Dashboard, instead of showing quick-stats cards and action cards, they see the full **Judging Hub** content inline (competition selector, levels, sub-events, contestant score breakdowns). A link to the **Tabulator Dashboard** (`/tabulator`) is placed in the top-right header area.

### Files to Modify

**`src/pages/Dashboard.tsx`**
1. Import `JudgingHub` component (lazy or direct) and detect `isTabulator` role
2. For tabulators:
   - Hide the quick-stats section (`stats.length > 0` block)
   - Hide the action cards grid
   - Add a "Tabulator Dashboard" link button in the top-right of the header (next to the welcome text)
   - Render the `JudgingHub` component inline as the main content
3. Non-tabulator users remain unchanged

**`src/pages/JudgingHub.tsx`**
- Export the `useJudgingOverview` hook and the inner content as a named export (e.g. `JudgingHubContent`) so Dashboard can embed it without duplicating code
- The default export stays as-is for the standalone `/judging` route

### Layout for Tabulators

```text
┌─────────────────────────────────────────────┐
│ Dashboard                    [Tab Dashboard] │
│ Welcome back, ...                            │
├─────────────────────────────────────────────┤
│                                              │
│  ┌─ Judging Hub Content ──────────────────┐  │
│  │ Competition search + table             │  │
│  │ Level tabs → sub-events → contestants  │  │
│  │ Expandable side-by-side scores         │  │
│  └────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

No database changes required.

