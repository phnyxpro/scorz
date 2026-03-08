

## Plan: Mobile Optimisation for Pill-Based Components

### Problem
The pill-based navigation pattern used across PenaltyConfig, ScoringSettingsManager, RegistrationsPillLayout, PenaltiesPage, PenaltiesCard, and RegistrationFormsInline needs mobile optimisation. Key issues:
- Pill bars can overflow on narrow screens (390px)
- Card padding is too generous for mobile
- Form grids (e.g. 3-col penalty tier inputs) don't collapse on small screens
- Tab bar in CompetitionDetail has many tabs that need horizontal scroll to work well
- Touch targets on switches and small buttons may be too small

### Changes

**1. Pill bar — horizontal scroll on mobile (all 5 components)**

Wrap pill bars in a horizontally scrollable container with `overflow-x-auto no-scrollbar` so they don't wrap awkwardly on small screens. Increase touch targets on mobile with `min-h-[44px]` on pill buttons.

Files: `PenaltyConfig.tsx`, `ScoringSettingsManager.tsx`, `RegistrationsPillLayout.tsx`, `PenaltiesPage.tsx`, `PenaltiesCard.tsx`

**2. Card padding — responsive (all 5 components)**

Change `p-5` to `p-3 sm:p-5` on `CardContent` so cards breathe better on mobile without excessive whitespace.

**3. PenaltyConfig.tsx — collapse form grids**

- "Add Penalty Tier" grid: change `grid-cols-3` to `grid-cols-1 sm:grid-cols-3`
- Time Limit / Grace Period grid: change `grid-cols-2` to `grid-cols-1 sm:grid-cols-2`

**4. ScoringSettingsManager.tsx — responsive sub-event settings**

The `grid-cols-1 sm:grid-cols-2` is already correct. Verify `max-w-sm` on the scoring method select doesn't cause issues — it's fine.

**5. RegistrationFormsInline.tsx — responsive field rows**

- The enable/required toggle rows already use `flex-wrap` but the "Required" toggle + label can be cramped. Add `mt-2 sm:mt-0` to the required toggle container on mobile so it wraps cleanly below.
- Change card content padding from `p-4` to `p-3 sm:p-4`.

**6. CompetitionDetail.tsx — tab bar touch targets**

The tab list already has `overflow-x-auto no-scrollbar`. Ensure each `TabsTrigger` has adequate height. Add `min-h-[44px]` to the TabsList for touch targets.

**7. PenaltiesPage.tsx — responsive table**

Wrap tables in `overflow-x-auto` div for horizontal scroll on narrow screens.

### Files Modified
- `src/components/competition/PenaltyConfig.tsx`
- `src/components/competition/ScoringSettingsManager.tsx`
- `src/components/competition/RegistrationsPillLayout.tsx`
- `src/components/competition/RegistrationFormsInline.tsx`
- `src/pages/PenaltiesPage.tsx`
- `src/components/judge/PenaltiesCard.tsx`
- `src/pages/CompetitionDetail.tsx`

