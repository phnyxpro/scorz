

## Plan: Add Masquerade Links to Staff Roster

### What
Add a "View as" (masquerade) button to each staff member row in the competition's Staff Roster tab, allowing admins to quickly impersonate a staff member's dashboard. This complements the existing masquerade feature in AdminUsers.

### Approach

**1. Update `StaffRow` component in `SubEventAssignments.tsx`**
- Accept the current user's admin status and the `startMasquerade` function (from `useAuth`)
- For staff who have **accepted** their invitation (meaning they have a platform account), show an `Eye` icon button in the action area
- Clicking it calls `startMasquerade` with the staff member's email and name, then navigates to `/dashboard`
- Need to resolve the staff member's `user_id` — query profiles by email to get `user_id`, or look it up from `sub_event_assignments` data

**2. Resolve user_id for accepted staff**
- Accepted staff have joined the platform. We can look up their `user_id` from the `profiles` table by matching `email`
- Add a small lookup: when an admin clicks "View as", fetch the profile by email to get the `user_id`, then call `startMasquerade`
- Alternatively, store/cache user_ids from assignable users already fetched

**3. Wire up in `SubEventAssignments`**
- Import `useAuth` and `useNavigate` at the component level
- Pass `hasRole("admin")`, `startMasquerade`, and `navigate` down to `StaffRow`
- Only show the masquerade button for admins and only for accepted staff (who have platform accounts)

**4. UI placement**
- Add the `Eye` button next to the existing Invite/Resend/Delete buttons in each `StaffRow`
- Style consistently with the existing masquerade button in `AdminUsers.tsx`

### Technical Details

- **File**: `src/components/competition/SubEventAssignments.tsx`
  - Import `useAuth` from `@/contexts/AuthContext`, `useNavigate` from `react-router-dom`, `Eye` from `lucide-react`
  - In the main component, get `hasRole, startMasquerade` from `useAuth()` and `navigate` from `useNavigate()`
  - Extend `StaffRowProps` with `isAdmin`, `onMasquerade` callback
  - In `StaffRow`, for accepted invitations, add an Eye button that triggers a profile lookup by email → then calls `onMasquerade({ userId, email, fullName })` → then navigates to `/dashboard`
  - The lookup can use `supabase.from("profiles").select("user_id").eq("email", inv.email).maybeSingle()` inline on click

No database changes required — this uses the existing masquerade infrastructure and profile data.

