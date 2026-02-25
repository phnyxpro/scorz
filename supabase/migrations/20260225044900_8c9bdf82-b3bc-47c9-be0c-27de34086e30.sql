
-- Contestant registrations table
CREATE TABLE public.contestant_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  sub_event_id uuid REFERENCES public.sub_events(id) ON DELETE SET NULL,
  
  -- Personal info
  full_name text NOT NULL,
  age_category text NOT NULL DEFAULT 'adult',
  location text,
  phone text,
  email text NOT NULL,
  
  -- Guardian info (minors)
  guardian_name text,
  guardian_email text,
  guardian_phone text,
  
  -- Profile / media
  bio text,
  social_handles jsonb DEFAULT '{}',
  performance_video_url text,
  profile_photo_url text,
  
  -- Rules acknowledgment
  rules_acknowledged boolean NOT NULL DEFAULT false,
  rules_acknowledged_at timestamptz,
  
  -- Signatures (stored as data URLs from canvas)
  contestant_signature text,
  contestant_signed_at timestamptz,
  guardian_signature text,
  guardian_signed_at timestamptz,
  
  -- Status
  status text NOT NULL DEFAULT 'pending',
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, competition_id)
);

ALTER TABLE public.contestant_registrations ENABLE ROW LEVEL SECURITY;

-- Users can view their own registrations
CREATE POLICY "Users can view own registrations"
  ON public.contestant_registrations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own registration
CREATE POLICY "Users can create own registration"
  ON public.contestant_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending registration
CREATE POLICY "Users can update own pending registration"
  ON public.contestant_registrations FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Admins/organizers can manage all registrations
CREATE POLICY "Admins and organizers can manage registrations"
  ON public.contestant_registrations FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]));

-- Admins/organizers can view all registrations
CREATE POLICY "Admins can view all registrations"
  ON public.contestant_registrations FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'organizer'::app_role]));

-- Trigger for updated_at
CREATE TRIGGER update_contestant_registrations_updated_at
  BEFORE UPDATE ON public.contestant_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
