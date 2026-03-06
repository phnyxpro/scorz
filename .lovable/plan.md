

## Plan: Admin Bypass for Subscriptions and Staff Limits

### Current State
- **Competition creation**: Admins already bypass subscription checks (`creditsAvailable = isAdmin ? 999`), so no changes needed there.
- **Staff roles**: Only "judge" and "tabulator" are available in `ASSIGNABLE_ROLES`. "Organiser" is missing.
- **Tier limits display**: The staff roster shows limit progress bars for all users, including admins. Admins should see a note that limits don't apply to them (or hide them entirely).

### Changes

**1. Add "organizer" to assignable staff roles (`SubEventAssignments.tsx`)**
- Expand `ASSIGNABLE_ROLES` from `["judge", "tabulator"]` to `["organizer", "judge", "tabulator"]`
- Update `roleColors` map to include an organizer color
- The organizer count will also show in the tier limits progress bar (it's already tracked by `useCompetitionStaffCounts`)

**2. Admin bypass for tier limits display (`SubEventAssignments.tsx`)**
- For admins, either hide the tier limits card entirely or show it with an "Unlimited" badge instead of numeric limits
- Remove the "Limit reached" warnings for admins since they have no caps

**3. Ensure `useCompetitionLimits` returns unlimited for admins (`useCompetitionLimits.ts`)**
- Update the hook to accept an `isAdmin` flag (or handle in the component) so admins get effectively unlimited limits (e.g. `Infinity` or a very high number)
- This ensures no downstream enforcement blocks admin actions

### Technical Details

**File: `src/components/competition/SubEventAssignments.tsx`**
- Change `ASSIGNABLE_ROLES` to include `"organizer"`
- Add organizer color to `roleColors`
- Wrap tier limits card in `!isAdmin &&` condition (admins don't need to see limits)

**File: `src/hooks/useCompetitionLimits.ts`**
- No changes needed — limits are display-only, no enforcement blocking. The component-level `isAdmin` check handles it.

