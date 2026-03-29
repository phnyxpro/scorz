
-- Function to delete a user's account and cascade through all their data
CREATE OR REPLACE FUNCTION public.delete_user_account(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow users to delete their own account
  IF auth.uid() IS DISTINCT FROM _user_id THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- Delete judge scores by this user
  DELETE FROM public.judge_scores WHERE judge_id = _user_id;

  -- Delete audience votes (no user_id column, but linked via ticket)
  -- Votes are anonymous, no cascade needed

  -- Delete certifications
  DELETE FROM public.chief_judge_certifications WHERE chief_judge_id = _user_id;
  DELETE FROM public.tabulator_certifications WHERE tabulator_id = _user_id;
  DELETE FROM public.witness_certifications WHERE witness_id = _user_id;

  -- Delete sub_event_assignments
  DELETE FROM public.sub_event_assignments WHERE user_id = _user_id;

  -- Delete contestant registrations (and related scores/votes)
  DELETE FROM public.judge_scores WHERE contestant_registration_id IN (
    SELECT id FROM public.contestant_registrations WHERE user_id = _user_id
  );
  DELETE FROM public.audience_votes WHERE contestant_registration_id IN (
    SELECT id FROM public.contestant_registrations WHERE user_id = _user_id
  );
  DELETE FROM public.performance_slots WHERE contestant_registration_id IN (
    SELECT id FROM public.contestant_registrations WHERE user_id = _user_id
  );
  DELETE FROM public.contestant_registrations WHERE user_id = _user_id;

  -- Delete event tickets
  DELETE FROM public.event_tickets WHERE user_id = _user_id;

  -- Delete user roles
  DELETE FROM public.user_roles WHERE user_id = _user_id;

  -- Delete profile
  DELETE FROM public.profiles WHERE user_id = _user_id;

  -- Finally delete the auth user (this requires service_role, done via SECURITY DEFINER)
  -- Note: We can't delete from auth.users in a security definer function without service role
  -- The user will sign out client-side after this
END;
$$;
