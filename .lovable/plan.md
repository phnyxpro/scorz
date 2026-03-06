

## Plan: Unified Transactional Email System for Scorz

### Current State

The project already has 3 edge functions sending emails via Resend, each with its own inline HTML and inconsistent styling:
- `send-staff-invite` — magic link invitation
- `notify-registration-status` — approval/rejection
- `send-ticket-email` — ticket confirmation with QR code

Brand identity: Charcoal primary (`hsl(220, 25%, 10%)` → `#1a1b25`), Orange accent (`hsl(38, 92%, 50%)` → `#f59e0b`), Inter + JetBrains Mono fonts, dark-mode-first aesthetic.

### What We'll Build

A shared email template system as a single edge function helper, plus new notification edge functions — all using a consistent branded HTML partial.

---

### 1. Shared Email Template Helper: `supabase/functions/_shared/email-html.ts`

A reusable function that wraps any email body in a branded layout:
- **Header**: Scorz wordmark (text-based, no image dependency) with orange accent on the "Z"
- **Body**: White background, charcoal text, Inter font stack
- **Footer**: `© 2026 SCORZ | Powered by phnyx.dev`, unsubscribe/manage preferences placeholder, CAN-SPAM compliant
- **Buttons**: Charcoal background (`#1a1b25`), white text, `border-radius: 8px`
- **Accent elements**: Orange (`#f59e0b`) for highlights, badges, and secondary CTAs

Exports: `buildEmail({ subject, preheader, body }: EmailOptions): string`

### 2. Refactor Existing Edge Functions

Update all 3 existing functions to use `buildEmail()` from the shared helper instead of inline HTML:
- `send-staff-invite/index.ts`
- `notify-registration-status/index.ts`
- `send-ticket-email/index.ts`

No functional changes — same logic, consistent branding.

### 3. New Auth-Adjacent Email Templates

**a. Welcome Email** — `supabase/functions/send-welcome-email/index.ts`
- Triggered from `AuthContext` on first sign-in (after role assignment)
- Personalized by role: "Welcome, Organiser — create your first competition" / "Welcome, Contestant — browse open events"
- CTA button to relevant dashboard

**b. Password Reset** — handled by Lovable's built-in auth emails (no custom function needed unless custom domain is set up)

### 4. New Platform Notification Functions

**a. Score Alert** — `supabase/functions/send-score-alert/index.ts`
- Notifies contestants when their scores are certified by the chief judge
- Pulls score data, criterion breakdown, and final score
- CTA: "View Your Scorecard"

**b. Competition Update** — `supabase/functions/send-competition-update/index.ts`
- Notifies registered contestants when an organizer posts a competition update
- Pulls update title + summary
- CTA: "Read Full Update"

**c. Subscription/Billing** — Already handled by Stripe's hosted emails via the checkout/portal flow. No custom function needed.

### 5. Client-Side Integration

- `src/hooks/useWelcomeEmail.ts` — hook that fires the welcome email on first login detection (checks a `welcome_sent` flag in profiles table)
- Update `src/components/competition/UpdatesManager.tsx` — add a "Notify Contestants" toggle when posting updates
- Update chief judge certification flow to trigger score alerts

### 6. Database Migration

Add `welcome_email_sent` boolean column to `profiles` table to prevent duplicate welcome emails:
```sql
ALTER TABLE public.profiles ADD COLUMN welcome_email_sent boolean NOT NULL DEFAULT false;
```

---

### Files

| File | Action |
|------|--------|
| `supabase/functions/_shared/email-html.ts` | Create — shared branded template builder |
| `supabase/functions/send-staff-invite/index.ts` | Edit — use shared template |
| `supabase/functions/notify-registration-status/index.ts` | Edit — use shared template |
| `supabase/functions/send-ticket-email/index.ts` | Edit — use shared template |
| `supabase/functions/send-welcome-email/index.ts` | Create — role-based welcome email |
| `supabase/functions/send-score-alert/index.ts` | Create — score certification notification |
| `supabase/functions/send-competition-update/index.ts` | Create — competition update notification |
| `supabase/config.toml` | Edit — register new functions |
| `src/hooks/useWelcomeEmail.ts` | Create — trigger welcome email on first login |
| `src/contexts/AuthContext.tsx` | Edit — integrate welcome email hook |
| `src/components/competition/UpdatesManager.tsx` | Edit — add notify toggle |
| Database migration | Add `welcome_email_sent` to profiles |

### Not Included (Out of Scope)

- **Live match alerts / weekly recaps**: The platform is a competition scoring tool, not a live sports feed. These don't apply to the current data model.
- **Custom auth email templates via Lovable's managed flow**: Only needed if a custom sender domain is configured. Currently emails send from `onboarding@resend.dev`. When you're ready for a custom domain, we can scaffold those separately.
- **Dynamic team logos in emails**: No team/logo model exists in the schema. Can be added later.

