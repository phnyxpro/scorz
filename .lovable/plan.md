

## Add Staff Limits per Tier, Mix-and-Match Credits, and Competition Lock

### 1. Add Staff Limits to Tier Configuration (`src/lib/stripe-tiers.ts`)

Add `limits` object to each `SubscriptionTier`:

| Tier | Organizers | Judges | Tabulators |
|------|-----------|--------|------------|
| Start Scorz ($15) | 2 | 7 | 2 |
| Pro Scorz ($49) | 4 | 10 | 2 |
| Enterprise Scorz ($149) | 15 | 20 | 15 |

Update the `SubscriptionTier` interface to include `limits: { organizers, judges, tabulators }` and add these to each tier definition. Also display them in the features list on both the About page and BillingPanel.

### 2. Track Which Tier a Competition Was Purchased With

The `competition_credits` table already has `tier_product_id` and `competition_id`. When a credit is consumed (competition created), the tier's limits apply to that specific competition. We need to:

- Store the `tier_product_id` on the credit when purchased (already done)
- When assigning staff to a competition, look up the credit used for that competition to determine limits
- Create a helper function/hook `useCompetitionLimits(competitionId)` that fetches the credit record for the competition and returns the tier limits

### 3. Enforce Staff Limits in SubEventAssignments

In `src/components/competition/SubEventAssignments.tsx`, before allowing a new staff assignment, check the total count of organizers/judges/tabulators across all sub-events for that competition against the tier limits. Show a warning/error if the limit is reached.

### 4. Mix-and-Match Credits on Dashboard

Update the BillingPanel to make it clear organizers can buy multiple credits from different tiers. Each credit is independent — a $15 credit creates a Start-tier competition, a $49 credit creates a Pro-tier competition. The current credit system already supports this (each row in `competition_credits` has its own `tier_product_id`).

Add a section to the organizer's Dashboard or Competitions page showing available credits grouped by tier, with "Buy More" buttons for each tier.

### 5. Lock Competition Editing Once Active

In `CompetitionDetail.tsx`, when `status === "active"` or the current date is between `start_date` and `end_date`, disable editing of core fields (name, slug, description, start/end dates, rubric, penalty rules). Show a banner explaining the competition is locked. Staff assignments and scoring should remain editable.

### Files to Change

- **`src/lib/stripe-tiers.ts`** — Add `limits` to interface and tier data
- **`src/pages/About.tsx`** — Display staff limits in pricing cards
- **`src/components/admin/BillingPanel.tsx`** — Show limits in tier cards
- **`src/hooks/useCompetitionLimits.ts`** — New hook to fetch tier limits for a competition
- **`src/components/competition/SubEventAssignments.tsx`** — Enforce staff count limits
- **`src/pages/CompetitionDetail.tsx`** — Lock editing when competition is active
- **`src/pages/Competitions.tsx`** or **`src/pages/Dashboard.tsx`** — Show credits by tier with buy-more buttons

