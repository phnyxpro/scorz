
# Platform Review: Optimizations, Security & Recommendations

## 1. Security Issues

### 1a. Overly Permissive RLS on `event_tickets` (HIGH)
The `event_tickets` table has `WITH CHECK (true)` on INSERT, meaning **anyone** (even unauthenticated users via the anon key) can insert ticket records. This should be scoped to authenticated users at minimum.

**Fix:** Change the INSERT policy to require `auth.uid() IS NOT NULL` or tie `user_id` to `auth.uid()`.

### 1b. Leaked Password Protection Disabled (MEDIUM)
The database linter flagged that leaked password protection is disabled. This Supabase Auth feature checks passwords against known breach databases.

**Fix:** Enable leaked password protection via auth configuration.

### 1c. Competition Delete Has No Confirmation (MEDIUM)
In `Competitions.tsx`, the delete button directly calls `remove.mutate(c.id)` with no confirmation dialog. One misclick destroys a competition and all associated data.

**Fix:** Add an `AlertDialog` confirmation before deletion.

### 1d. Walk-in Registration Bypasses Consent (MEDIUM)
The walk-in quick-add in `RegistrationsManager.tsx` auto-sets `rules_acknowledged: true` and `status: "approved"` without the contestant actually acknowledging rules or signing. This creates a consent gap -- the organizer is attesting on behalf of the contestant without any record of their agreement.

**Fix:** Add a disclaimer checkbox in the walk-in dialog ("Contestant has verbally acknowledged the rules") and store a `walk_in: true` flag or note.

### 1e. No Input Validation on Edge Functions (LOW-MEDIUM)
The `create-checkout` and `notify-registration-status` edge functions accept body input without schema validation. For example, `priceId` is accepted as-is. While Stripe would reject invalid IDs, explicit validation prevents unnecessary API calls and provides clearer errors.

**Fix:** Add zod or manual validation for incoming request bodies in edge functions.

### 1f. Masquerade Mode Fetches Target Roles Client-Side (LOW)
`startMasquerade` in `AuthContext.tsx` reads the target user's roles from `user_roles` table. This only works if the current user has admin SELECT access. The masquerade doesn't actually change the auth token, so all database operations still run as the real admin user -- the impersonation is cosmetic only. This is acceptable but should be clearly documented.

---

## 2. Performance Optimizations

### 2a. Subscription Check Fires on Every Role Change (MEDIUM)
In `AuthContext.tsx`, `refreshSubscription` depends on `roles` in its `useEffect` dependency array (line ~100). Every time roles update, it re-checks the subscription by calling the edge function, which hits the Stripe API. This is wasteful.

**Fix:** Remove `roles` from the dependency array. Only trigger on `session?.user?.id` changes. The 60-second periodic refresh already handles updates.

### 2b. No Query Deduplication on Subscription Check
`AdminPanel.tsx` has its own separate `check-subscription` query (line 122-130) while `AuthContext` already stores subscription state. This causes redundant Stripe API calls.

**Fix:** Remove the duplicate query in `AdminPanel.tsx` and use `subscription` from `useAuth()` instead.

### 2c. Competitions Page Counts ALL Competitions for Limit Check
`competitionCount` uses `competitions?.length` which counts competitions the user can see (including others' if admin). For organizers, this should only count competitions they created (`created_by === user.id`).

**Fix:** Filter by `created_by` when computing limit, or add a dedicated query counting only the user's own competitions.

### 2d. Public Events Page Missing Stale Time
`usePublicCompetitions` has no `staleTime` configured, so it refetches on every mount. Public data doesn't change frequently.

**Fix:** Add `staleTime: 60_000` (1 minute) to the query options.

---

## 3. UX / Flow Improvements

### 3a. No Link to Pricing from Landing Page
The public landing page (`PublicEvents.tsx`) and the auth page have no link to `/pricing`. Users can't discover pricing.

**Fix:** Add a "Pricing" link to the public header nav and the auth page.

### 3b. Pricing Page Uses Wrong Logo Component
`Pricing.tsx` uses a Trophy icon instead of the Scorz logo SVG used everywhere else. This breaks brand consistency.

**Fix:** Import and use `scorzLogo` from `@/assets/scorz-logo.svg`.

### 3c. Dashboard Greeting Shows Email Instead of Name
`Dashboard.tsx` greets users with their email address. The user's full name is available in `user.user_metadata?.full_name`.

**Fix:** Display the name when available, falling back to email.

### 3d. Registration Flow Allows Proceeding After Account Step Without Verification
In `ContestantRegistration.tsx`, after the "Account Setup" step, the user can proceed to fill in all details even though they haven't verified their email. When they try to submit at the end, it will fail because `user` is still `null`. The flow should either block until verified or handle the unverified state gracefully.

**Fix:** Show a clear message that submission requires email verification, or use auto-confirm for contestant registrations.

### 3e. Empty Dashboard for Non-Organizer Roles
The dashboard shows the same cards for all roles. A judge sees "Competitions" and "Contestants" cards that aren't relevant to their workflow. The "People's Choice" card links to `/competitions` which is generic.

**Fix:** Tailor dashboard cards based on the user's primary role.

---

## 4. Technical Implementation Plan

### Priority 1 -- Security Fixes (Critical)
1. Tighten `event_tickets` INSERT RLS policy to require authentication
2. Add delete confirmation dialog to competition cards
3. Add consent disclaimer to walk-in registration dialog

### Priority 2 -- Performance Fixes
4. Remove `roles` from subscription refresh dependency
5. Remove duplicate subscription query in AdminPanel
6. Add `staleTime` to public competitions query
7. Fix competition count to filter by `created_by` for organizers

### Priority 3 -- UX Improvements
8. Add Pricing link to public header and auth page
9. Fix Pricing page logo to use Scorz SVG
10. Update Dashboard greeting to show user's name
11. Handle unverified user state in registration flow

### Files to Modify
- `src/contexts/AuthContext.tsx` -- fix subscription refresh deps
- `src/pages/Competitions.tsx` -- add delete confirmation, fix competition count
- `src/pages/AdminPanel.tsx` -- remove duplicate subscription query
- `src/pages/Dashboard.tsx` -- show name instead of email
- `src/pages/PublicEvents.tsx` -- add Pricing link to header
- `src/pages/Pricing.tsx` -- fix logo
- `src/pages/Auth.tsx` -- add Pricing link
- `src/components/competition/RegistrationsManager.tsx` -- add walk-in consent checkbox
- Database migration for `event_tickets` INSERT policy fix

### Database Migration Required
```sql
-- Fix overly permissive event_tickets INSERT policy
DROP POLICY "Anyone can register for tickets" ON public.event_tickets;
CREATE POLICY "Authenticated users can register for tickets"
  ON public.event_tickets FOR INSERT TO authenticated
  WITH CHECK (true);
```
