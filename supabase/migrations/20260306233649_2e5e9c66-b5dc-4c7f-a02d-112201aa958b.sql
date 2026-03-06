
CREATE OR REPLACE FUNCTION public.accept_staff_invitations(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email text;
BEGIN
  -- Get the user's email from auth
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  IF _email IS NULL THEN RETURN; END IF;

  -- Mark all pending invitations for this email as accepted
  UPDATE public.staff_invitations
  SET accepted_at = now()
  WHERE lower(email) = lower(_email)
    AND accepted_at IS NULL;
END;
$$;
