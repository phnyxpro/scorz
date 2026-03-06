

## Plan: Allow Masquerade for Uninvited Staff

Currently the "View as" (masquerade) button on the Staff Roster only appears when `inv.accepted_at` is truthy (line 546). This means staff who haven't been invited yet — or invited but haven't accepted — can't be impersonated.

The masquerade function looks up the user by email in the `profiles` table and silently fails if no profile exists (`if (!profile?.user_id) return`). This is safe — if the person hasn't signed up yet, nothing happens.

### Change

**File: `src/components/competition/SubEventAssignments.tsx`**

- **Line 546**: Remove the `inv.accepted_at` condition so the button renders for all staff rows when the viewer is an admin:
  - From: `{isAdmin && inv.accepted_at && onMasquerade && (`
  - To: `{isAdmin && onMasquerade && (`

- **Line 60-66**: Add a toast notification when the profile lookup fails (user hasn't signed up yet) so admins get feedback instead of silent failure:
  ```ts
  if (!profile?.user_id) {
    toast.error("This user hasn't signed up yet — masquerade unavailable.");
    return;
  }
  ```

No other changes needed. The button will appear for all staff; if the person hasn't created an account yet, the admin gets a clear error message.

