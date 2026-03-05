
-- The previous migration partially succeeded: responsibility column added, witness table dropped,
-- enum renamed to app_role_old and new app_role created.
-- Now we need to drop policies referencing the role column, alter columns, then recreate policies.

-- Drop all RLS policies on user_roles that reference the role column
DROP POLICY IF EXISTS "Users can self-assign contestant or audience role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can assign roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Drop all RLS policies on sub_event_assignments
DROP POLICY IF EXISTS "Admins and organizers can manage assignments" ON public.sub_event_assignments;
DROP POLICY IF EXISTS "Authenticated can view assignments" ON public.sub_event_assignments;
DROP POLICY IF EXISTS "Public can view assignments" ON public.sub_event_assignments;

-- Delete witness data before type change
DELETE FROM public.user_roles WHERE role::text = 'witness';
DELETE FROM public.sub_event_assignments WHERE role::text = 'witness';

-- Now alter columns
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;
ALTER TABLE public.sub_event_assignments ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;

-- Drop old enum
DROP TYPE IF EXISTS public.app_role_old;

-- Recreate user_roles policies
CREATE POLICY "Admins can assign roles" ON public.user_roles
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can self-assign contestant or audience role" ON public.user_roles
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND role = ANY(ARRAY['contestant'::app_role, 'audience'::app_role])
  );

-- Recreate sub_event_assignments policies
CREATE POLICY "Admins and organizers can manage assignments" ON public.sub_event_assignments
  FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]));

CREATE POLICY "Authenticated can view assignments" ON public.sub_event_assignments
  FOR SELECT USING (true);

CREATE POLICY "Public can view assignments" ON public.sub_event_assignments
  FOR SELECT USING (true);

-- Recreate has_role and has_any_role functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$function$;
