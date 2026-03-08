

## Plan: Restyle PenaltyConfig with FinCom Calculator Showcase Pattern

### Reference Pattern (FinCom)
The FinCom `CalculatorShowcase` uses:
- **Category filter pills** across the top (rounded-full buttons that toggle active state with `bg-primary text-primary-foreground` when selected)
- **Grid of cards** (`rounded-xl border bg-card p-5`) with icon + label in a row, description below, and a CTA button

### What Changes

**File: `src/components/competition/PenaltyConfig.tsx`**

Replace the current three stacked `<Card>` sections with:

1. **Category pill bar** at the top — three toggleable pills: "Time Penalties", "General Penalties", "DQ Rules" (styled identically to FinCom: `px-4 py-1.5 rounded-full text-sm font-medium border transition-all`, primary fill when active, card/muted when inactive)

2. **Single card below** that renders the content for the active category, with the **active category title shown as a pill/badge** at the top of the card (e.g. a `rounded-full` badge with the icon + title like `<ShieldAlert /> Time Penalties`)

3. The card body contains the same form fields and existing items list as today — just scoped to whichever pill is selected. No logic changes, only layout restructuring.

### Structure

```text
┌─────────────────────────────────────────┐
│  [⏱ Time Penalties] [⚠ General] [🚫 DQ] │  ← pill bar (filter)
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  ┌──────────────────┐                   │
│  │ ⏱ Time Penalties │  ← pill/badge    │
│  └──────────────────┘                   │
│  Description text...                    │
│                                         │
│  [existing form + list content]         │
└─────────────────────────────────────────┘
```

### Implementation Details
- Add `useState<"time" | "general" | "dq">` to track active category (replaces the three separate cards)
- Pill bar uses the same `rounded-full` class pattern as FinCom
- Active pill: `bg-primary text-primary-foreground border-primary`
- Inactive pill: `bg-card text-muted-foreground border-border hover:border-primary/40`
- Card title rendered as a `Badge`-style pill with the category icon inside the card header
- All existing CRUD logic, form state, and handlers remain unchanged

### Files Modified
- `src/components/competition/PenaltyConfig.tsx` — single file, layout-only refactor

