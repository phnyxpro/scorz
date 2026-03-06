

## Platform Evaluation: Optimizations, Security, and Improvements

### Assessment Summary

After scanning the codebase, database schema, RLS policies, and running a security audit, here are the findings organized by priority.

---

### 1. CRITICAL: Security Findings (4 errors, 4 warnings)

The security scan found **4 error-level** and **4 warning-level** issues. These must be addressed first.

**A. Profiles table publicly readable (ERROR)**
- `profiles` has a `Public can view profiles` RLS policy with `USING (true)` — exposes emails, phone numbers, and avatar URLs to unauthenticated users.
- **Fix**: Drop the public SELECT policy. Keep only the authenticated one, and restrict it to `auth.uid() = user_id` for full profile data. Create a limited view for name/avatar lookups.

**B. Contestant registrations expose PII (ERROR)**
- The `Public can view approved contestants` policy exposes email, phone, guardian contacts, and signatures.
- **Fix**: Create a `public_contestants` database view that only exposes `id`, `full_name`, `bio`, `profile_photo_url`, `age_category`, `location`, `social_handles`, `competition_id`, `sub_event_id`, `sort_order`. Use the view in public-facing queries.

**C. Event tickets publicly readable (ERROR)**
- `Users can view own tickets` has `USING (true)` — anyone can read all ticket holder names, emails, and phones.
- **Fix**: Change to `USING (auth.uid() = user_id)`.

**D. Audience votes expose voter PII (ERROR)**
- `Users can view vote counts` has `USING (true)` — all authenticated users can see voter names, emails, phones.
- **Fix**: Change to `USING (has_any_role(auth.uid(), ARRAY['admin', 'organizer']))` for full data. For public counts, create a database function that returns aggregated counts only.

**E. Leaked password protection disabled (WARN)**
- Enable leaked password protection in auth settings.

**F. Chief judge signatures publicly readable (WARN)**
- Restrict `Authenticated can view certifications` to relevant roles only.

**G. Event tickets INSERT too permissive (WARN)**
- `Authenticated users can register for tickets` has `WITH CHECK (true)` — any authenticated user can insert a ticket with any user_id. Fix: `WITH CHECK (auth.uid() = user_id OR user_id IS NULL)`.

---

### 2. Architecture Optimizations

**A. Route-level code splitting (High Impact)**
- All 40+ pages are imported eagerly in `App.tsx`. This means the entire app is bundled into a single chunk.
- **Fix**: Use `React.lazy()` + `Suspense` for every route. This alone could cut initial load by 60-70%.

**B. QueryClient configuration**
- `QueryClient` is created with zero configuration — no `staleTime`, no `gcTime`, no error boundaries.
- **Fix**: Set sensible defaults: `staleTime: 5 * 60 * 1000` for most queries, configure `retry: 1` to avoid hammering the API on failures.

**C. Realtime channel management**
- Realtime subscriptions in `useJudgeScoresRealtime` and `useCertificationRealtime` are well-structured but should use more granular invalidation. Currently they invalidate entire query keys on any change.
- **Fix**: Use the `payload.new` data from realtime events to do targeted cache updates instead of full refetches.

**D. N+1 query pattern in Dashboard**
- `useAssignedCompetitions` makes 4 sequential queries (assignments → sub_events → levels → competitions). This waterfall adds latency.
- **Fix**: Create a database function `get_assigned_competitions(user_id)` that returns the result in a single round-trip.

**E. Optimistic UI**
- Already implemented for `useUpsertScore` — good. Extend this pattern to other high-frequency mutations (ticket check-in, vote submission).

---

### 3. Database & Data Integrity

**A. Missing foreign key indexes**
- Several FK columns lack explicit indexes (e.g., `judge_scores.contestant_registration_id`, `judge_scores.judge_id`, `sub_event_assignments.user_id`). Postgres creates indexes for unique constraints but not regular FKs.
- **Fix**: Add composite indexes for common query patterns:
  ```sql
  CREATE INDEX idx_judge_scores_sub_contestant ON judge_scores(sub_event_id, contestant_registration_id);
  CREATE INDEX idx_assignments_user ON sub_event_assignments(user_id, sub_event_id);
  ```

**B. Missing `updated_at` trigger**
- The `update_updated_at_column()` function exists but the schema shows no triggers attached. Verify triggers are applied to all tables with `updated_at` columns.

**C. Score integrity**
- `final_score` is computed client-side (`raw_total - time_penalty`). If either value is updated independently, they can drift.
- **Fix**: Add a database trigger that recalculates `final_score` whenever `raw_total` or `time_penalty` changes.

---

### 4. Compliance & Privacy

**A. Data minimization**
- Registration collects guardian signatures, phone numbers, and emails. These should be encrypted at rest or at minimum excluded from any public-facing query.
- The public contestants view (item 1B above) addresses this.

**B. Right to deletion**
- No DELETE policy exists on `profiles`. Users cannot delete their own data.
- **Fix**: Add a `Users can delete own profile` policy and a corresponding "Delete My Account" flow that cascades through registrations and scores.

**C. Consent tracking**
- `rules_acknowledged` and `rules_acknowledged_at` exist on registrations — good. Consider adding a general `consent_given_at` timestamp to `profiles` for GDPR compliance.

---

### 5. UX & Performance Quick Wins

**A. Skeleton screens** — Already in use on Dashboard. Extend to all data-loading pages.

**B. Service Worker / PWA** — Add a basic service worker to cache the app shell. For a live scoring platform, users losing connectivity mid-event is a real risk. Cache the rubric, criteria, and current contestant list locally.

**C. Mobile bottom nav** — Already implemented. Ensure it adapts to role (it does via `visibleNavItems`).

---

### Implementation Plan (Prioritized)

| Priority | Task | Scope |
|----------|------|-------|
| P0 | Fix 4 RLS policy errors (profiles, tickets, votes, registrations) | DB migration |
| P0 | Enable leaked password protection | Auth config |
| P1 | Create `public_contestants` view for safe public access | DB migration |
| P1 | Fix ticket INSERT policy to scope to own user_id | DB migration |
| P1 | Tighten certifications/signatures visibility | DB migration |
| P2 | Add `React.lazy()` code splitting to all routes | `App.tsx` |
| P2 | Configure QueryClient defaults (staleTime, retry) | `App.tsx` |
| P2 | Add database indexes for FK columns | DB migration |
| P2 | Add `updated_at` triggers to all tables | DB migration |
| P3 | Create `get_assigned_competitions()` DB function | DB migration + hook |
| P3 | Add `final_score` recalculation trigger | DB migration |
| P3 | Add account deletion flow | Migration + UI |

### Recommendation

Start with P0 security fixes — the 4 RLS errors represent real data exposure risks in production. These are all single-migration fixes. Then move to P2 performance items which will noticeably improve the user experience.

Shall I proceed with the P0 security fixes first?

