
-- 1. Add unique constraint on sub_event_assignments for ON CONFLICT support
ALTER TABLE public.sub_event_assignments
  ADD CONSTRAINT sub_event_assignments_user_sub_role_unique
  UNIQUE (user_id, sub_event_id, role);

-- 2. Add unique constraint on user_roles for ON CONFLICT support
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_role_unique
  UNIQUE (user_id, role);

-- 3. Rewrite accept_staff_invitations to provision roles and assignments
CREATE OR REPLACE FUNCTION public.accept_staff_invitations(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _email text;
  _inv record;
  _sub record;
BEGIN
  -- Get the user's email from auth
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  IF _email IS NULL THEN RETURN; END IF;

  -- Loop through pending invitations for this email
  FOR _inv IN
    SELECT id, role, is_chief
    FROM public.staff_invitations
    WHERE lower(email) = lower(_email)
      AND accepted_at IS NULL
  LOOP
    -- Mark invitation as accepted
    UPDATE public.staff_invitations
    SET accepted_at = now()
    WHERE id = _inv.id;

    -- Provision user role (idempotent)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, _inv.role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Provision sub-event assignments from staff_invitation_sub_events
    FOR _sub IN
      SELECT sub_event_id
      FROM public.staff_invitation_sub_events
      WHERE staff_invitation_id = _inv.id
    LOOP
      INSERT INTO public.sub_event_assignments (user_id, sub_event_id, role, is_chief)
      VALUES (_user_id, _sub.sub_event_id, _inv.role, _inv.is_chief)
      ON CONFLICT (user_id, sub_event_id, role) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$function$;

-- 4. Backfill: provision roles and assignments for already-accepted invitations
DO $$
DECLARE
  _inv record;
  _sub record;
  _uid uuid;
BEGIN
  FOR _inv IN
    SELECT si.id, si.email, si.role, si.is_chief
    FROM public.staff_invitations si
    WHERE si.accepted_at IS NOT NULL
  LOOP
    -- Resolve user_id from auth.users by email
    SELECT au.id INTO _uid FROM auth.users au WHERE lower(au.email) = lower(_inv.email);
    IF _uid IS NULL THEN CONTINUE; END IF;

    -- Provision user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, _inv.role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Provision sub-event assignments
    FOR _sub IN
      SELECT sub_event_id
      FROM public.staff_invitation_sub_events
      WHERE staff_invitation_id = _inv.id
    LOOP
      INSERT INTO public.sub_event_assignments (user_id, sub_event_id, role, is_chief)
      VALUES (_uid, _sub.sub_event_id, _inv.role, _inv.is_chief)
      ON CONFLICT (user_id, sub_event_id, role) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;
