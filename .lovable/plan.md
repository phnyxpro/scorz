

## Improvement Recommendations for Scorz

After a thorough review of the codebase, security scan, and architecture, here are the highest-impact improvements grouped by priority.

---

### 1. CRITICAL: Fix Privilege Escalation — Self-Assignable Organizer Role

The security scan found that **any authenticated user can self-assign the `organizer` role**, which grants full access to all contestant PII, registrations, tickets, staff invitations, and audience votes across all competitions.

**Fix:** Remove `organizer` from the self-assignable roles in the `user_roles` INSERT policy. Only `contestant` and `audience` should be self-assignable. Organizer role should be admin-assigned only.

```sql
-- Replace existing policy
DROP POLICY "Users can self-assign allowed roles" ON public.user_roles;
CREATE POLICY "Users can self-assign allowed roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role IN ('contestant', 'audience'));
```

---

### 2. CRITICAL: Lock Down Overly Permissive RLS Policies

Several tables have `WITH CHECK (true)` or `USING (true)` policies exposing data to unauthenticated or any authenticated user:

| Table | Issue | Fix |
|-------|-------|-----|
| `staff_invitations` | All PII readable by any authenticated user | Restrict SELECT to `email = auth.email()` OR admin/organizer |
| `notifications` | Public can INSERT to any user | Restrict to `authenticated` role |
| `activity_log` | Public can INSERT arbitrary entries | Restrict to `authenticated` role or service role |
| `competition_credits` | Any user can insert credits for any user | Restrict to service role only |
| `staff_invitation_sub_events` | All mappings readable by any user | Restrict to own invitations or admin/organizer |
| `platform_settings` | Config readable by anonymous | Restrict to authenticated |

Each fix is a single `DROP POLICY` + `CREATE POLICY` migration.

---

### 3. Performance: Dashboard Stats N+1 Queries

`useDashboardStats` makes 5-7 sequential `await` calls on every load. This should be consolidated into a single database function (RPC) that returns all stats in one round-trip, consistent with the existing pattern noted in the architecture memory.

---

### 4. UX: Accessibility Improvements

The search found **zero `aria-label` attributes** across all pages. Key improvements:
- Add `aria-label` to icon-only buttons (sign out, settings, admin, notification bell)
- Add `aria-live="polite"` to toast/notification regions
- Add `role="navigation"` to mobile bottom nav
- Add screen-reader text to badge indicators (unread counts)

---

### 5. UX: Empty State for Contestant/Audience Dashboard

When a user with only `contestant` or `audience` role logs in with no registrations or tickets, the dashboard shows minimal content with no guidance. Add a friendly empty state card pointing them to browse public events or register for a competition.

---

### Summary of changes

| Priority | Area | Files |
|----------|------|-------|
| Critical | Privilege escalation fix | New migration |
| Critical | RLS policy hardening (6 tables) | New migration |
| Medium | Dashboard stats RPC | New migration + `useDashboardStats.ts` |
| Medium | Accessibility | `AppLayout.tsx`, `Auth.tsx`, key page components |
| Low | Empty states | `Dashboard.tsx` |

I recommend tackling items 1 and 2 first as they are active security vulnerabilities.

