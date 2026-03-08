
-- Update accept_staff_invitations to copy staff invitation name into profile
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
  _profile_name text;
BEGIN
  -- Get the user's email from auth
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  IF _email IS NULL THEN RETURN; END IF;

  -- Get current profile full_name
  SELECT full_name INTO _profile_name FROM public.profiles WHERE user_id = _user_id;

  -- Loop through pending invitations for this email
  FOR _inv IN
    SELECT id, role, is_chief, name
    FROM public.staff_invitations
    WHERE lower(email) = lower(_email)
      AND accepted_at IS NULL
  LOOP
    -- If profile has no name but invitation does, copy it
    IF (_profile_name IS NULL OR _profile_name = '') AND _inv.name IS NOT NULL AND _inv.name != '' THEN
      UPDATE public.profiles
      SET full_name = _inv.name, updated_at = now()
      WHERE user_id = _user_id;
      _profile_name := _inv.name;
    END IF;

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
