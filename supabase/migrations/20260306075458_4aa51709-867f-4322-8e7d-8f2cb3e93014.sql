-- Add per-competition branding columns
ALTER TABLE public.competitions
ADD COLUMN IF NOT EXISTS branding_logo_url text,
ADD COLUMN IF NOT EXISTS branding_primary_color text,
ADD COLUMN IF NOT EXISTS branding_accent_color text,
ADD COLUMN IF NOT EXISTS branding_font text,
ADD COLUMN IF NOT EXISTS white_label boolean NOT NULL DEFAULT false;

-- API keys table for Enterprise users
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  name text NOT NULL DEFAULT 'Default',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own API keys"
  ON public.api_keys FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());