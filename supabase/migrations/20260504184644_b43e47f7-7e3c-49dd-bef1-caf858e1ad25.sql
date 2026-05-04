
ALTER TABLE public.chief_judge_certifications
  ADD COLUMN IF NOT EXISTS final_placement_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS final_order_updated_by uuid,
  ADD COLUMN IF NOT EXISTS final_order_updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_final_placement_order(
  _sub_event_id uuid,
  _order jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing record;
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['tabulator','chief_judge','admin','organizer']::app_role[]) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT id, is_certified INTO _existing
    FROM public.chief_judge_certifications
   WHERE sub_event_id = _sub_event_id;

  IF _existing.id IS NULL THEN
    INSERT INTO public.chief_judge_certifications
      (sub_event_id, chief_judge_id, final_placement_order,
       final_order_updated_by, final_order_updated_at)
    VALUES
      (_sub_event_id, auth.uid(), _order, auth.uid(), now());
  ELSE
    IF _existing.is_certified
       AND NOT has_any_role(auth.uid(), ARRAY['admin','organizer']::app_role[]) THEN
      RAISE EXCEPTION 'Sub-event is certified; only admins can change final placement order';
    END IF;

    UPDATE public.chief_judge_certifications
       SET final_placement_order  = _order,
           final_order_updated_by = auth.uid(),
           final_order_updated_at = now(),
           updated_at = now()
     WHERE id = _existing.id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_final_placement_order(uuid, jsonb) TO authenticated;
