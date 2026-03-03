ALTER TABLE public.competitions ADD COLUMN slug text;
UPDATE public.competitions SET slug = 'fcnps2025' WHERE id = 'a1000000-0000-0000-0000-000000000001';
UPDATE public.competitions SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;
UPDATE public.competitions SET slug = id::text WHERE slug IS NULL OR slug = '';
ALTER TABLE public.competitions ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.competitions ADD CONSTRAINT competitions_slug_key UNIQUE (slug);