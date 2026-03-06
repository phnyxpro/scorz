-- Add active scoring level and sub-event tracking to competitions
ALTER TABLE public.competitions
ADD COLUMN IF NOT EXISTS active_scoring_level_id UUID REFERENCES public.competition_levels(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS active_scoring_sub_event_id UUID REFERENCES public.sub_events(id) ON DELETE SET NULL;

-- Create a view for quick lookup of active scoring configuration
CREATE OR REPLACE VIEW active_scoring_config AS
SELECT 
  c.id as competition_id,
  c.active_scoring_level_id,
  c.active_scoring_sub_event_id,
  cl.name as level_name,
  se.name as sub_event_name
FROM public.competitions c
LEFT JOIN public.competition_levels cl ON c.active_scoring_level_id = cl.id
LEFT JOIN public.sub_events se ON c.active_scoring_sub_event_id = se.id
WHERE c.active_scoring_level_id IS NOT NULL AND c.active_scoring_sub_event_id IS NOT NULL;
