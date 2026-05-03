
ALTER TABLE public.sub_events
  ADD COLUMN IF NOT EXISTS lineup_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lineup_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS lineup_locked_by uuid;

CREATE OR REPLACE FUNCTION public.withdraw_contestant(_registration_id uuid, _new_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _reg record;
  _sub_locked boolean;
  _promoted_id uuid;
  _withdrawn_sort int;
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF _new_status NOT IN ('no_show', 'disqualified', 'dropped_out', 'approved') THEN
    RAISE EXCEPTION 'Invalid status: %', _new_status;
  END IF;

  SELECT id, sub_event_id, sort_order, special_entry_type
    INTO _reg
    FROM public.contestant_registrations
   WHERE id = _registration_id;

  IF _new_status != 'approved' THEN
    _withdrawn_sort := _reg.sort_order;

    UPDATE public.contestant_registrations
       SET status = _new_status, sub_event_id = NULL, updated_at = now()
     WHERE id = _registration_id;

    DELETE FROM public.judge_scores WHERE contestant_registration_id = _registration_id;
    DELETE FROM public.performance_durations WHERE contestant_registration_id = _registration_id;
    DELETE FROM public.performance_timer_events WHERE contestant_registration_id = _registration_id;
    DELETE FROM public.audience_votes WHERE contestant_registration_id = _registration_id;
    UPDATE public.performance_slots
       SET contestant_registration_id = NULL, is_booked = false
     WHERE contestant_registration_id = _registration_id;

    -- Auto-promote standby if a main lineup spot was vacated and lineup is unlocked
    IF _reg.sub_event_id IS NOT NULL
       AND (_reg.special_entry_type IS NULL OR _reg.special_entry_type NOT IN ('standby_1','standby_2'))
    THEN
      SELECT lineup_locked INTO _sub_locked FROM public.sub_events WHERE id = _reg.sub_event_id;
      IF _sub_locked IS NOT TRUE THEN
        -- Pick Standby 1 first, then Standby 2
        SELECT id INTO _promoted_id
          FROM public.contestant_registrations
         WHERE sub_event_id = _reg.sub_event_id
           AND status = 'approved'
           AND special_entry_type IN ('standby_1','standby_2')
         ORDER BY CASE special_entry_type WHEN 'standby_1' THEN 1 WHEN 'standby_2' THEN 2 ELSE 3 END
         LIMIT 1;

        IF _promoted_id IS NOT NULL THEN
          UPDATE public.contestant_registrations
             SET special_entry_type = NULL,
                 sort_order = COALESCE(_withdrawn_sort, sort_order),
                 updated_at = now()
           WHERE id = _promoted_id;
        END IF;
      END IF;
    END IF;
  ELSE
    UPDATE public.contestant_registrations
       SET status = _new_status, updated_at = now()
     WHERE id = _registration_id;
  END IF;
END;
$function$;
