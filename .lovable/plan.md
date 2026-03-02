

## Fix: Public Schedule Not Showing on Event Page

### Problem
The `/events/:id` page shows "No levels defined" because the database security policies on `competition_levels` and `sub_events` tables only allow **logged-in users** to read data. Visitors who aren't signed in get empty results.

The `competitions` table already has a public-access policy, but the child tables (`competition_levels`, `sub_events`) do not.

### Solution
Add public SELECT policies to both tables so unauthenticated visitors can view the competition schedule.

### Database Changes

**1. Add public SELECT policy on `competition_levels`:**
- Allow anyone (including anonymous visitors) to read levels
- Policy: `USING (true)` for SELECT, applied to the `anon` role

**2. Add public SELECT policy on `sub_events`:**
- Same approach -- allow anyone to read sub-events so the schedule renders

### Code Changes

**3. Update `PublicEventDetail.tsx` header branding:**
- Replace leftover `Zap` icon and "SCORE" text with the Scorz logo (missed in the earlier rebrand)
- Update footer to remove "PHNYX.DEV" reference

### Technical Details

Two new RLS policies will be created:

```sql
CREATE POLICY "Public can view levels"
  ON public.competition_levels FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can view sub_events"
  ON public.sub_events FOR SELECT
  TO anon
  USING (true);
```

These are safe because levels and sub-events contain no sensitive data -- they only hold names, dates, times, and locations, which are intended to be publicly visible on the event page.
