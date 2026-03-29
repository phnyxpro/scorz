-- 1. Backfill missing sub_event_assignments for already-accepted invitations
INSERT INTO sub_event_assignments (user_id, sub_event_id, role, is_chief, is_production_assistant)
SELECT p.user_id, sise.sub_event_id, si.role, si.is_chief, si.is_production_assistant
FROM staff_invitations si
JOIN staff_invitation_sub_events sise ON sise.staff_invitation_id = si.id
JOIN profiles p ON lower(p.email) = lower(si.email)
WHERE si.accepted_at IS NOT NULL
ON CONFLICT (user_id, sub_event_id, role) DO NOTHING;

-- 2. Add trigger to auto-sync future sub-event additions to accepted invitations
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