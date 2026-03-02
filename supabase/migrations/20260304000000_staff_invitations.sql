-- Create staff invitations table
CREATE TABLE IF NOT EXISTS public.staff_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role public.app_role NOT NULL,
    competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    UNIQUE (email, competition_id, role)
);

-- Update handle_new_user to use invitations or default to organizer
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    invited_role public.app_role;
BEGIN
    -- 1. Create Profile
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );

    -- 2. Check for staff invitations
    SELECT role INTO invited_role 
    FROM public.staff_invitations 
    WHERE email = NEW.email 
    AND accepted_at IS NULL
    ORDER BY created_at DESC 
    LIMIT 1;

    IF invited_role IS NOT NULL THEN
        -- Assign invited role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, invited_role);
        
        -- Mark invitations as accepted
        UPDATE public.staff_invitations 
        SET accepted_at = now() 
        WHERE email = NEW.email;
    ELSE
        -- Default to organizer role for fresh signups
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'organizer');
    END IF;

    RETURN NEW;
END;
$$;

-- RLS for staff invitations
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view invitations for their competitions"
    ON public.staff_invitations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.competitions
            WHERE id = staff_invitations.competition_id
            AND created_by = auth.uid()
        ) OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Organizers can create invitations"
    ON public.staff_invitations FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.competitions
            WHERE id = staff_invitations.competition_id
            AND created_by = auth.uid()
        ) OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Organizers can delete invitations"
    ON public.staff_invitations FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.competitions
            WHERE id = staff_invitations.competition_id
            AND created_by = auth.uid()
        ) OR public.has_role(auth.uid(), 'admin')
    );
