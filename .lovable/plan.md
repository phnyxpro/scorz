

## Billing Model Change: Per-Competition Pricing

### What changes

**1. Pricing model shift** — from "per month" to "per competition"

| Tier | Old | New |
|---|---|---|
| Start Scorz | $15/month (5 comps) | $15/competition |
| Pro Scorz | $49/month (20 comps) | $49/competition |
| Enterprise Scorz | $149/month (unlimited) | $149/competition |

The `competitionLimit` field becomes irrelevant with per-competition pricing. Instead, each purchase unlocks one competition. The Stripe products will need to be changed from `mode: "subscription"` to `mode: "payment"` (one-off) in the checkout flow.

**2. USD disclaimer** — Add "All prices quoted in USD" subtext beneath the pricing grids on both the About page and the BillingPanel.

**3. Geolocation currency display** — Use the browser's `navigator.language` or `Intl` API to detect locale and show an approximate local currency equivalent (e.g., "~€14" or "~R275") next to the USD price. This is display-only; actual charges remain in USD via Stripe.

**4. Feature audit against platform** — Evaluate each listed feature per tier against what's actually built:

| Feature | Tier | Implemented? |
|---|---|---|
| Unlimited contestants | Start | Yes — no cap enforced |
| Full rubric builder | Start | Yes — `RubricBuilder.tsx` |
| Digital scoring | Start | Yes — `JudgeScoring.tsx` |
| Basic analytics | Start | Partial — dashboard stats exist but no dedicated analytics page |
| Advanced analytics | Pro | Not implemented — no analytics beyond basic dashboard |
| Custom branding | Pro | Partial — banner upload exists, no per-competition branding controls |
| Priority support | Pro | Not implemented (operational, not code) |
| Audience voting | Pro | Yes — `PublicVotingForm.tsx`, `useAudienceVoting.ts` |
| Ticketing system | Pro | Yes — `TicketsHub.tsx`, `AudienceTicketForm.tsx` |
| White-label branding | Enterprise | Not implemented |
| API access | Enterprise | Not implemented |
| Dedicated support | Enterprise | Not implemented (operational) |
| Custom integrations | Enterprise | Not implemented |

### Files to update

**`src/lib/stripe-tiers.ts`**
- Remove `competitionLimit` from the interface
- Change descriptions from "/month" to "/competition"
- Update feature lists to reflect per-competition model and flag unimplemented features with "(coming soon)"
- Add a helper constant for the USD disclaimer text

**`src/components/admin/BillingPanel.tsx`**
- Change `/month` label to `/competition`
- Add USD disclaimer below the tier grid
- Add approximate local currency using `Intl.NumberFormat` with the user's locale
- Change checkout `mode` from `"subscription"` to `"payment"` — or keep as-is if Stripe products are still set to recurring (this depends on how Stripe products are configured)

**`src/pages/About.tsx`**
- Change `/month` to `/competition` in the pricing section
- Add USD disclaimer
- Add locale-based currency approximation

**`supabase/functions/create-checkout/index.ts`**
- Change `mode: "subscription"` to `mode: "payment"` for one-off per-competition purchases
- Remove the "already has active subscription" check since users can buy multiple times

**`supabase/functions/check-subscription/index.ts`**
- Adapt to check for completed payments/charges rather than active subscriptions, or track purchased competition credits in a database table

**`src/contexts/AuthContext.tsx`**
- Remove `competitionLimit` from `SubscriptionStatus`
- Replace with a credit-based or purchase-count model

**`src/pages/Competitions.tsx`**
- Update the enforcement logic from "subscription limit" to "purchased credits remaining"

### Important consideration

Switching from subscriptions to one-off payments is a significant architectural change. The current Stripe products are configured as recurring subscriptions. New Stripe products/prices would need to be created as one-time prices, or the existing ones reconfigured. This also means the `check-subscription` function needs to be rethought — instead of checking for active subscriptions, it would need to track how many competitions a user has purchased vs. created.

A simple approach: add a `competition_credits` table that tracks purchased credits and deducts when a competition is created.

### Technical details

- Currency approximation: Use `fetch("https://open.er-api.com/v6/latest/USD")` or a similar free exchange rate API from an edge function, cached daily. Fallback: show USD only.
- Alternatively, use `Intl.NumberFormat(navigator.language, { style: "currency", currency: detectedCurrency })` with a static approximation table for major currencies to avoid an external API dependency.

