

## Plan: Mobile Optimisation — Competition Settings Page

### Problem
The Competition Detail page (`CompetitionDetail.tsx`) contains 12 tabs with multiple sub-components. Several areas have mobile usability issues at 390px:
- **General tab**: Social links section has 5 full-width inputs stacked without labels; date grid works but could be tighter
- **Schedule tab** (`LevelsManager`): Sub-event cards have action buttons that overflow on narrow screens; the "Add level" input + button row can be tight
- **Time Slots tab** (`SlotsManager`): "Generate Slots" grid uses `grid-cols-3` which gets cramped at 390px; the slots table needs horizontal scroll wrapper; Level/Sub-event selector grid uses `grid-cols-2` which is tight
- **Staff tab** (`SubEventAssignments`): Staff row action buttons (Preview, Invite, Edit, Delete, View as) overflow horizontally; sub-event assignment selectors use `pl-11` which wastes space on mobile
- **Sponsors tab** (`SponsorsManager`): Card padding could be responsive; sponsor row layout is fine
- **Branding tab** (`BrandingManager`): Color picker grid uses `grid-cols-2` which is fine but padding can be responsive; preview card padding is static
- **Chat tab** (`EventChat`): Channel selector and DM picker may need mobile adjustments (separate scope)
- **Rules/Rubric tabs**: Card content padding is static `space-y-3`; scan button row can wrap awkwardly

### Changes

**1. `CompetitionDetail.tsx` — General tab responsive tweaks**
- Change `CardContent` from implicit padding to `p-3 sm:p-5`
- Social links: add small label before each input for clarity on mobile

**2. `SlotsManager.tsx` — Collapse generate-slots grid on mobile**
- Change `grid-cols-3` to `grid-cols-1 sm:grid-cols-3` for the Start Time / Slot Count / Duration fields
- Change `grid-cols-2` to `grid-cols-1 sm:grid-cols-2` for Level / Sub-event selectors
- Ensure slots table has `overflow-x-auto` wrapper (already present)

**3. `SubEventAssignments.tsx` — Mobile-friendly staff rows**
- Staff row action buttons: wrap in `flex-wrap` so they flow to next line on narrow screens
- Reduce `pl-11` to `pl-4 sm:pl-11` for sub-event assignment area on mobile
- Staff add form: already uses `grid-cols-1 sm:grid-cols-2` (fine)

**4. `SponsorsManager.tsx` — Responsive card padding**
- Change `CardContent` to `p-3 sm:p-5` padding
- Add form section padding responsive

**5. `BrandingManager.tsx` — Responsive padding and preview**
- `CardContent` padding to `p-3 sm:p-5`
- Color grid: keep `grid-cols-2` (works at 390px)
- Preview section: reduce padding on mobile `p-3 sm:p-4`

**6. `CompetitionDetail.tsx` — Rules & Rubric tabs**
- Card content padding responsive `p-3 sm:p-5`
- Scan button row: add `flex-wrap` so buttons wrap on narrow screens

### Files Modified
- `src/pages/CompetitionDetail.tsx`
- `src/components/competition/SlotsManager.tsx`
- `src/components/competition/SubEventAssignments.tsx`
- `src/components/competition/SponsorsManager.tsx`
- `src/components/competition/BrandingManager.tsx`

