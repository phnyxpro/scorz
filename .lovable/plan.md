

## Plan: Enable Magic Link Sign-In for Organisers

### Problem
The organiser role in `SIGNIN_ROLES` has `magicLink: false`, so the magic link option is not shown when an organiser selects their role on the sign-in screen.

### Change

**Edit `src/pages/Auth.tsx`** (line 28):
- Change the organiser entry from `magicLink: false` to `magicLink: true`
- Update the description from `"Manage your events"` to `"Password or magic link"` to match judge/tabulator

Single-line change, no backend or routing modifications needed.

