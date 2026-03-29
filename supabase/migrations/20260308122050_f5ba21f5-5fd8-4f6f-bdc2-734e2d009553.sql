
-- Columns already added from previous partial migration, add idempotently
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='staff_invitations' AND column_name='is_production_assistant') THEN
    ALTER TABLE public.staff_invitations ADD COLUMN is_production_assistant boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sub_event_assignments' AND column_name='is_production_assistant') THEN
    ALTER TABLE public.sub_event_assignments ADD COLUMN is_production_assistant boolean NOT NULL DEFAULT false;
  END IF;
END$$;

-- Update accept_staff_invitations
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
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  IF _email IS NULL THEN RETURN; END IF;
  SELECT full_name INTO _profile_name FROM public.profiles WHERE user_id = _user_id;

  FOR _inv IN
    SELECT id, role, is_chief, name, is_production_assistant
    FROM public.staff_invitations
    WHERE lower(email) = lower(_email)
      AND accepted_at IS NULL
  LOOP
    IF (_profile_name IS NULL OR _profile_name = '') AND _inv.name IS NOT NULL AND _inv.name != '' THEN
      UPDATE public.profiles SET full_name = _inv.name, updated_at = now() WHERE user_id = _user_id;
      _profile_name := _inv.name;
    END IF;

    UPDATE public.staff_invitations SET accepted_at = now() WHERE id = _inv.id;

    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _inv.role) ON CONFLICT (user_id, role) DO NOTHING;

    FOR _sub IN
      SELECT sub_event_id FROM public.staff_invitation_sub_events WHERE staff_invitation_id = _inv.id
    LOOP
      INSERT INTO public.sub_event_assignments (user_id, sub_event_id, role, is_chief, is_production_assistant)
      VALUES (_user_id, _sub.sub_event_id, _inv.role, _inv.is_chief, _inv.is_production_assistant)
      ON CONFLICT (user_id, sub_event_id, role) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$function$;

-- Drop and recreate get_assigned_competitions
DROP FUNCTION IF EXISTS public.get_assigned_competitions(uuid);

CREATE FUNCTION public.get_assigned_competitions(_user_id uuid)
 RETURNS TABLE(competition_id uuid, competition_name text, competition_slug text, competition_status text, competition_banner_url text, sub_event_id uuid, sub_event_name text, level_id uuid, level_name text, assignment_role app_role, is_chief boolean, is_production_assistant boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    c.id, c.name, c.slug, c.status, c.banner_url,
    se.id, se.name, cl.id, cl.name,
    sa.role, sa.is_chief, sa.is_production_assistant
  FROM public.sub_event_assignments sa
  JOIN public.sub_events se ON se.id = sa.sub_event_id
  JOIN public.competition_levels cl ON cl.id = se.level_id
  JOIN public.competitions c ON c.id = cl.competition_id
  WHERE sa.user_id = _user_id
  ORDER BY c.name, cl.sort_order, se.name;
$function$;
