

## Plan: Add "Edit Order" Link + Modal to Performance Timer

The Performance Timer in TabulatorDashboard currently has inline drag-and-drop on the paginated contestant grid. Per the user's request, add a simpler "Edit Order" link that opens a modal with full drag-and-drop reordering (matching the existing `PerformanceOrder` component pattern).

### Changes

**1. Update `src/components/scoring/TabulatorTimer.tsx`**
- Add state: `showReorderModal`
- Add an "Edit Order" link/button next to the "Contestant on Stage" label
- Add a `Dialog` component containing:
  - Full vertical list of all contestants with drag handles (same pattern as `PerformanceOrder`)
  - "Randomize" button (optional quick action)
  - Order persists to `sort_order` on save

**2. UI Behavior**
- Link styled as subtle text link: "Edit Order →" or icon button with `ListOrdered`
- Modal shows all contestants in a scrollable list (not paginated) with GripVertical handles
- Drag-and-drop reorders; changes saved immediately or on close
- Timer is disabled while modal is open to prevent conflicts

**3. Reuse Pattern**
- Copy the drag logic from `PerformanceOrder.tsx` into the modal body
- Invalidate `judging_overview` and `approved-contestants-order` queries on reorder
- Optionally include "Randomize Draw" button in the modal footer

### Files to Edit
- `src/components/scoring/TabulatorTimer.tsx` — add modal trigger + dialog with reorder list

