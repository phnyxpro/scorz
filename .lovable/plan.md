

## Plan: Role-Based Sign Up and Sign In for /auth

### Summary

Redesign the Auth page so that:
- **Sign Up** allows Organizer, Contestant, or Audience (user picks role first)
- **Sign In** has two paths: password-based for Organizer/Contestant/Audience, and Magic Link for Judge/Tabulator
- Judge/Tabulator accounts are system-created (via staff invitation) — they never sign up, only sign in via magic link

### Changes

#### 1. `src/contexts/AuthContext.tsx`

- Update `signUp` to accept an optional `role` parameter and store it in `user_metadata` (e.g. `{ full_name, signup_role }`)
- Add `signInWithMagicLink(email: string)` method that calls `supabase.auth.signInWithOtp({ email })` — no password needed
- Expose `signInWithMagicLink` in the context type and provider value

After signup, the role self-assignment happens client-side: insert into `user_roles` with the chosen role (existing RLS policy already allows users to self-assign `contestant` or `audience`).

For `organizer` role: the existing RLS only allows self-assign of `contestant`/`audience`. We need a DB migration to also allow self-assigning `organizer`.

#### 2. Database Migration

Update the RLS policy on `user_roles` to allow self-assigning the `organizer` role:

```sql
DROP POLICY "Users can self-assign contestant or audience role" ON public.user_roles;
CREATE POLICY "Users can self-assign allowed roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND role = ANY(ARRAY['contestant'::app_role, 'audience'::app_role, 'organizer'::app_role])
  );
```

#### 3. `src/pages/Auth.tsx` — Full Rewrite

**Sign Up tab** (renamed from "Organiser Sign Up" to "Sign Up"):
- Step 1: Role selector — three cards/radio buttons: "Event Organizer", "Contestant", "Audience Member"
- Step 2: Registration form (name, email, password) with role-specific description text
- On submit: call `signUp()`, then after email verification + login, auto-insert the chosen role into `user_roles`
- Post-signup role assignment: add a `useEffect` in Auth or AuthContext that checks `user_metadata.signup_role` and inserts into `user_roles` if no role exists yet

**Sign In tab**:
- Step 1: Role selector — five options grouped into two categories:
  - **Password login**: Organizer, Contestant, Audience
  - **Magic Link**: Judge, Tabulator
- When Organizer/Contestant/Audience selected: show email + password form (current behavior)
- When Judge/Tabulator selected: show email-only form + "Send Magic Link" button. Info text explains their account was created when assigned by an organizer
- Demo accounts accordion remains at the bottom

**UI details**:
- Role cards use icons: `Briefcase` (Organizer), `Star` (Contestant), `Users` (Audience), `Scale` (Judge), `Calculator` (Tabulator)
- Selected role highlighted with accent border
- Card description updates to match: "Sign in to manage events" / "Sign in as a competitor" / etc.
- For magic link sign-in, show a success state: "Check your email for a login link"

#### 4. Post-Signup Role Assignment

Add logic in `AuthContext` (inside the `onAuthStateChange` handler, on `SIGNED_IN` event):
- Check `user.user_metadata.signup_role`
- Query `user_roles` to see if user already has that role
- If not, insert it (the RLS policy allows self-assignment of organizer/contestant/audience)
- Clear the metadata flag by calling `supabase.auth.updateUser({ data: { signup_role: null } })`

This handles the case where the user signs up, verifies email, and returns — the role gets assigned on first login.

### Files Modified
- `src/contexts/AuthContext.tsx` — add `signInWithMagicLink`, update `signUp` signature, add post-signup role assignment
- `src/pages/Auth.tsx` — full rewrite with role selection UI
- Database migration — update `user_roles` self-assign RLS policy to include `organizer`

### No Other Changes Needed
- Staff invitation flow (`StaffInvitationForm`) already handles judge/tabulator account creation separately
- Existing routing/protected routes work as-is since they check roles from the `user_roles` table

