-- Dynamic Registration Form Config per competition
CREATE TABLE IF NOT EXISTS registration_form_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  form_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(competition_id)
);

-- Contestant advancement history
CREATE TABLE IF NOT EXISTS contestant_advancements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES contestant_registrations(id) ON DELETE CASCADE,
  from_sub_event_id UUID REFERENCES sub_events(id),
  to_sub_event_id UUID NOT NULL REFERENCES sub_events(id),
  advanced_by UUID NOT NULL,
  advanced_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- Add custom_data column to contestant_registrations for storing dynamic form values
ALTER TABLE contestant_registrations
  ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

-- RLS for registration_form_config
ALTER TABLE registration_form_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read form config"
  ON registration_form_config FOR SELECT
  USING (true);

CREATE POLICY "Admins and organizers can manage form config"
  ON registration_form_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'organizer')
    )
  );

-- RLS for contestant_advancements
ALTER TABLE contestant_advancements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read advancements"
  ON contestant_advancements FOR SELECT
  USING (true);

CREATE POLICY "Staff can create advancements"
  ON contestant_advancements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'organizer', 'chief_judge', 'tabulator')
    )
  );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_advancements_registration
  ON contestant_advancements(registration_id);

CREATE INDEX IF NOT EXISTS idx_form_config_competition
  ON registration_form_config(competition_id);
