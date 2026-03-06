

## Plan: Magic Link Landing Page + Staff Invitation Email

### 1. New Page: `src/pages/MagicLinkLanding.tsx`

A welcome page that authenticated judges/tabulators land on after clicking a magic link. It will:
- Check auth state via `useAuth()`
- Display a branded welcome message with the user's name and detected role (judge/tabulator)
- Show a brief "Welcome aboard" message explaining their role
- Auto-redirect to the appropriate dashboard after 3 seconds (or on button click):
  - Judge → `/judge-dashboard`
  - Tabulator → `/tabulator` (or `/dashboard` as fallback)
  - Default → `/dashboard`
- If not authenticated, redirect to `/auth`

### 2. Route Registration: `src/App.tsx`

Add a new route `/welcome` pointing to `MagicLinkLanding`. This will be a protected route wrapped in `AppLayout`.

### 3. Update Magic Link Redirect URL: `src/contexts/AuthContext.tsx`

Change `signInWithMagicLink` to redirect to `/welcome` instead of `/dashboard`:
```
emailRedirectTo: `${window.location.origin}/welcome`
```

### 4. New Edge Function: `supabase/functions/send-staff-invite/index.ts`

Create an edge function that:
- Accepts `{ email, role, competition_name, competition_id }` 
- Uses the Supabase Admin API (`supabase.auth.admin.generateLink`) to generate a magic link for the invited user
- If the user doesn't exist yet, creates them via `supabase.auth.admin.createUser` first (with a random password, since they'll use magic links)
- Sends a branded HTML email via Resend with:
  - Competition name and assigned role
  - A prominent "Sign In to Scorz" button linking to the magic link
  - Brief instructions about their role
- Falls back to a generic sign-in URL (`/auth`) if magic link generation fails

### 5. Update `src/hooks/useStaffInvitations.ts`

Modify `useInviteStaff` mutation to call the new `send-staff-invite` edge function after inserting the invitation record, passing the email, role, and competition name so the invitation email is sent automatically.

### 6. Update `src/components/admin/StaffInvitationForm.tsx`

Pass competition name to the invite mutation so the email can reference it. This requires the parent component to provide the competition name as a prop.

### Files

| File | Action |
|------|--------|
| `src/pages/MagicLinkLanding.tsx` | Create — welcome/redirect page |
| `src/App.tsx` | Edit — add `/welcome` route |
| `src/contexts/AuthContext.tsx` | Edit — update magic link redirect URL |
| `supabase/functions/send-staff-invite/index.ts` | Create — email with magic link |
| `src/hooks/useStaffInvitations.ts` | Edit — call edge function on invite |
| `src/components/admin/StaffInvitationForm.tsx` | Edit — pass competition name prop |

### No database changes required

The existing `staff_invitations` table and RLS policies are sufficient.

