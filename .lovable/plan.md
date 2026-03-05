

## Plan: Merge Admin Panel into Dashboard as Action Cards

Instead of embedding a tabbed interface, the admin features become three action cards on the Dashboard that link to dedicated pages.

### Changes

1. **`src/lib/navigation.ts`** -- Replace the 3 admin dashboard cards (Admin Panel, Platform Analytics, Support Mode) with:
   - "User Management" → `/admin/users`
   - "Global Settings" → `/admin/settings`  
   - "Billing" → `/admin/billing`

2. **Create 3 new page components** by extracting from `AdminPanel.tsx`:
   - `src/pages/AdminUsers.tsx` -- Platform stats + user table with role management + masquerade
   - `src/pages/AdminSettings.tsx` -- Wraps `GlobalSettingsPanel`
   - `src/pages/AdminBilling.tsx` -- Wraps `BillingPanel`

3. **`src/App.tsx`** -- Replace the single `/admin` route with:
   - `/admin/users`
   - `/admin/settings`
   - `/admin/billing`
   - Redirect `/admin` → `/admin/users`

4. **`src/pages/Dashboard.tsx`** -- For admin users, show the platform analytics stats (Total Users, Competitions, Active Events, Registrations) above the action cards. The admin action cards from `navigation.ts` handle the rest.

5. **`src/pages/AdminPanel.tsx`** -- Remove or convert to redirect.

6. **`src/components/GlobalSearch.tsx`** -- Update any `/admin` references to the new routes.

### Files

| File | Action |
|------|--------|
| `src/pages/AdminUsers.tsx` | Create -- user table + stats + masquerade |
| `src/pages/AdminSettings.tsx` | Create -- global settings wrapper |
| `src/pages/AdminBilling.tsx` | Create -- billing wrapper |
| `src/lib/navigation.ts` | Update admin cards to 3 dedicated routes |
| `src/App.tsx` | Add 3 admin sub-routes, redirect `/admin` |
| `src/pages/Dashboard.tsx` | Add inline platform stats for admins |
| `src/pages/AdminPanel.tsx` | Remove or redirect |
| `src/components/GlobalSearch.tsx` | Update admin references |

