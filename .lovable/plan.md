

## Problem

Staff invitations are being accepted (the `accepted_at` timestamp is set), but the system never creates the corresponding `sub_event_assignments` records. The `accept_staff_invitations` database function only marks invitations as accepted — it does not provision the actual assignments that the Judge/Tabulator dashboards query.

The dashboards use `useStaffView` → `useMyAssignedSubEvents` → queries `sub_event_assignments`, which is currently empty for NPS 2026.

## Root Cause

The `accept_staff_invitations` RPC function is:
```sql
UPDATE public.staff_invitations SET accepted_at = now()
WHERE lower(email) = lower(_email) AND accepted_at IS NULL;
```
It never inserts into `sub_event_assignments` or provisions `user_roles`.

## Plan

### 1. Update the `accept_staff_invitations` database function

Rewrite it to also:
- Look up sub-events from `staff_invitation_sub_events` for each accepted invitation
- Insert into `sub_event_assignments` (with `ON CONFLICT DO NOTHING` to be idempotent)
- Insert the invitation's role into `user_roles` (with `ON CONFLICT DO NOTHING`)

This is a single SQL migration.

### 2. Backfill existing accepted invitations

Run a one-time migration that creates `sub_event_assignments` and `user_roles` entries for the 3 already-accepted invitations (Shivanee, Mtmima, Stefan) based on their `staff_invitation_sub_events` data.

### Technical Details

The updated function will loop through newly-accepted invitations and for each:
1. Resolve `user_id` from `auth.users` by email
2. Insert into `user_roles` (role from invitation)
3. For each linked sub-event in `staff_invitation_sub_events`, insert into `sub_event_assignments` with the role and `is_chief` flag

Both steps use `ON CONFLICT DO NOTHING` to prevent duplicates on re-login.

