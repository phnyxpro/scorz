

## Plan: Fix Staff Invite Email Sender and Role Labels

### Issues Found

1. **Wrong sender address**: `send-staff-invite` sends from `Scorz <onboarding@resend.dev>` (Resend sandbox) instead of the verified domain `Scorz <no-reply@notify.scorz.live>` used by all other functions. Emails from the sandbox address can only be delivered to the Resend account owner — they won't reach external recipients like `stefan@phnyx.pro`.

2. **Missing "organizer" role label**: The role label mapping doesn't include `organizer`, so if an organizer is invited, the role text falls through to the raw enum value.

### Changes

**File: `supabase/functions/send-staff-invite/index.ts`**

- Line 149: Change `from: "Scorz <onboarding@resend.dev>"` → `from: "Scorz <no-reply@notify.scorz.live>"`
- Line 113-118: Add `organizer` to the role label mapping:
  ```
  role === "organizer" ? "Organizer"
  : role === "judge" ? "Judge"
  : ...
  ```

No other changes needed — the template already uses the shared branded `buildEmail` + `ctaButton` helpers with the correct Charcoal/Orange theme, SCORZ header, and footer.

After fixing, the invite can be tested by clicking "Send Invite" on a staff row in the roster for `stefan@phnyx.pro`.

