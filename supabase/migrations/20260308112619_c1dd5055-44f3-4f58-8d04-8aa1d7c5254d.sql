
CREATE OR REPLACE FUNCTION public.withdraw_contestant(
  _registration_id uuid,
  _new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow admin/organizer
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Validate status
  IF _new_status NOT IN ('no_show', 'disqualified', 'dropped_out', 'approved') THEN
    RAISE EXCEPTION 'Invalid status: %', _new_status;
  END IF;

  -- Update registration status
  UPDATE public.contestant_registrations
  SET status = _new_status, updated_at = now()
  WHERE id = _registration_id;

  -- If withdrawing (not reinstating), delete scoring data
  IF _new_status != 'approved' THEN
    DELETE FROM public.judge_scores WHERE contestant_registration_id = _registration_id;
    DELETE FROM public.performance_durations WHERE contestant_registration_id = _registration_id;
    DELETE FROM public.performance_timer_events WHERE contestant_registration_id = _registration_id;
    DELETE FROM public.audience_votes WHERE contestant_registration_id = _registration_id;
    UPDATE public.performance_slots
    SET contestant_registration_id = NULL, is_booked = false
    WHERE contestant_registration_id = _registration_id;
  END IF;
END;
$$;
