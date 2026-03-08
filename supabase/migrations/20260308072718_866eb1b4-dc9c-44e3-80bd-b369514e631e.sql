
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(_user_id uuid, _is_admin_or_org boolean, _is_judge boolean, _is_tabulator boolean, _is_contestant boolean)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  cnt bigint;
  seven_days_ago timestamptz := now() - interval '7 days';
  thirty_days_from_now date := (current_date + interval '30 days')::date;
BEGIN
  -- Active Events (always)
  SELECT count(*) INTO cnt FROM public.competitions WHERE status IN ('active', 'draft');
  result := result || jsonb_build_array(jsonb_build_object('label', 'Active Events', 'value', cnt, 'to', '/competitions'));

  IF _is_admin_or_org THEN
    SELECT count(*) INTO cnt FROM public.contestant_registrations WHERE status = 'pending';
    result := result || jsonb_build_array(jsonb_build_object('label', 'Pending Registrations', 'value', cnt, 'to', '/registrations'));

    SELECT count(*) INTO cnt FROM public.contestant_registrations WHERE status = 'approved';
    result := result || jsonb_build_array(jsonb_build_object('label', 'Approved Contestants', 'value', cnt, 'to', '/contestants'));

    SELECT count(*) INTO cnt FROM public.sub_event_assignments;
    result := result || jsonb_build_array(jsonb_build_object('label', 'Total Judges', 'value', cnt, 'to', '/staff'));

    SELECT count(*) INTO cnt FROM public.contestant_registrations WHERE created_at >= seven_days_ago;
    result := result || jsonb_build_array(jsonb_build_object('label', 'Recent Registrations', 'value', cnt, 'to', '/registrations'));

    SELECT count(*) INTO cnt FROM public.sub_events WHERE event_date >= current_date AND event_date <= thirty_days_from_now;
    result := result || jsonb_build_array(jsonb_build_object('label', 'Upcoming Events', 'value', cnt, 'to', '/competitions'));
  END IF;

  IF _is_judge THEN
    SELECT count(*) INTO cnt FROM public.sub_event_assignments WHERE user_id = _user_id AND role = 'judge'::app_role;
    result := result || jsonb_build_array(jsonb_build_object('label', 'My Assignments', 'value', cnt, 'to', '/judge-dashboard'));

    SELECT count(*) INTO cnt FROM public.judge_scores WHERE judge_id = _user_id AND is_certified = false;
    result := result || jsonb_build_array(jsonb_build_object('label', 'Uncertified Scores', 'value', cnt, 'to', '/judge-dashboard'));
  END IF;

  IF _is_tabulator THEN
    SELECT count(*) INTO cnt FROM public.tabulator_certifications WHERE is_certified = false;
    result := result || jsonb_build_array(jsonb_build_object('label', 'Pending Verifications', 'value', cnt, 'to', '/tabulator'));
  END IF;

  IF _is_contestant THEN
    SELECT count(*) INTO cnt FROM public.contestant_registrations WHERE user_id = _user_id;
    result := result || jsonb_build_array(jsonb_build_object('label', 'My Registrations', 'value', cnt, 'to', '/profile'));
  END IF;

  RETURN result;
END;
$$;
