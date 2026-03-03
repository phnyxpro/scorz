
-- Platform settings key-value store for global config
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings"
ON public.platform_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage settings"
ON public.platform_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('branding', '{"app_name": "Scorz", "tagline": "Competition Management Platform", "primary_color": "", "logo_url": ""}'::jsonb),
  ('registration_defaults', '{"default_age_category": "adult", "require_guardian_for_minors": true, "auto_approve": false, "required_fields": ["full_name", "email", "phone"]}'::jsonb),
  ('email_notifications', '{"welcome_email": true, "registration_confirmation": true, "score_published": true, "event_reminders": true}'::jsonb),
  ('feature_flags', '{"audience_voting": true, "ticketing": true, "performance_slots": true, "sponsor_display": true, "social_links": true}'::jsonb);

CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
