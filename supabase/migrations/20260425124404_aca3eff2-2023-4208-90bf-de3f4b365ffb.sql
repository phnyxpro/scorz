-- Backfill performance_video_url for SPARK competitions from the custom field
-- where the video link was originally captured (cf_1774992869708 / Google Drive link)

UPDATE public.contestant_registrations cr
SET performance_video_url = NULLIF(cr.custom_field_values->>'cf_1774992869708', '')
FROM public.competitions c
WHERE cr.competition_id = c.id
  AND c.name ILIKE '%spark%'
  AND (cr.performance_video_url IS NULL OR cr.performance_video_url = '')
  AND COALESCE(cr.custom_field_values->>'cf_1774992869708', '') <> '';