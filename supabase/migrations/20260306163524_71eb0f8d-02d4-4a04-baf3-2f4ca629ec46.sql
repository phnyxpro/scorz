
INSERT INTO storage.buckets (id, name, public)
VALUES ('help-images', 'help-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for help images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'help-images');

CREATE POLICY "Authenticated users can upload help images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'help-images');
