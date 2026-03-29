

# Fix: Missing Judge Assignments for Semi-Finals

## Root Cause

The four judges (Jean Claude Cournand, Patti-Anne Ali, Shivanee Ramlochan, Kwame Weekes) and the tabulators were assigned to the Semi-final sub-event in `staff_invitation_sub_events` **after** they had already accepted their invitations. The `accept_staff_invitations` RPC only runs once at login and doesn't retroactively sync new sub-event additions — so their `sub_event_assignments` rows for the Semi-final were never created.

Only `chromatics.tt` (Richard Rajkumar) shows because his invitation was accepted after the Semi-final assignment was added.

## Fix

### 1. Insert missing `sub_event_assignments` (immediate data fix)

Run a migration that backfills missing assignments by joining accepted invitations with their sub-events and inserting any that don't already exist:

```sql
INSERT INTO sub_event_assignments (user_id, sub_event_id, role, is_chief, is_production_assistant)
SELECT p.user_id, sise.sub_event_id, si.role, si.is_chief, si.is_production_assistant
FROM staff_invitations si
JOIN staff_invitation_sub_events sise ON sise.staff_invitation_id = si.id
JOIN profiles p ON lower(p.email) = lower(si.email)
WHERE si.accepted_at IS NOT NULL
ON CONFLICT (user_id, sub_event_id, role) DO NOTHING;
```

### 2. Add a database trigger to auto-sync future additions

Create a trigger on `staff_invitation_sub_events` so that when an organiser adds a sub-event to an **already-accepted** invitation, the corresponding `sub_event_assignment` is created immediately:

```sql
CREATE OR REPLACE FUNCTION sync_invitation_sub_event_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  _inv record;
  _uid uuid;
BEGIN
  SELECT * INTO _inv FROM staff_invitations WHERE id = NEW.staff_invitation_id;
  IF _inv.accepted_at IS NULL THEN RETURN NEW; END IF;

  SELECT user_id INTO _uid FROM profiles WHERE lower(email) = lower(_inv.email) LIMIT 1;
  IF _uid IS NULL THEN RETURN NEW; END IF;

  INSERT INTO sub_event_assignments (user_id, sub_event_id, role, is_chief, is_production_assistant)
  VALUES (_uid, NEW.sub_event_id, _inv.role, _inv.is_chief, _inv.is_production_assistant)
  ON CONFLICT (user_id, sub_event_id, role) DO NOTHING;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_sync_invitation_sub_event
AFTER INSERT ON staff_invitation_sub_events
FOR EACH ROW EXECUTE FUNCTION sync_invitation_sub_event_assignment();
```

## Impact

- Immediately fixes the Semi-final judges/tabulators not showing.
- Prevents the same problem from recurring when sub-events are added to accepted invitations in the future.
- No application code changes needed.

## Files Changed

| File | Change |
|------|--------|
| New migration | Backfill missing assignments + add sync trigger |

