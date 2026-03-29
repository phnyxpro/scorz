
CREATE OR REPLACE FUNCTION public.set_active_scoring(
  _competition_id uuid,
  _level_id uuid DEFAULT NULL,
  _sub_event_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow tabulator, admin, or organizer
  IF NOT has_any_role(auth.uid(), ARRAY['tabulator'::app_role, 'admin'::app_role, 'organizer'::app_role]) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE public.competitions
  SET active_scoring_level_id = _level_id,
      active_scoring_sub_event_id = _sub_event_id
  WHERE id = _competition_id;
END;
$$;
