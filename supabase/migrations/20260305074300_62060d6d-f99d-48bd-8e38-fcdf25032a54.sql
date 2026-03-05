
-- Create contestant-media storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('contestant-media', 'contestant-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contestant-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to update/delete their own media
CREATE POLICY "Users can manage own media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'contestant-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access
CREATE POLICY "Public can view contestant media"
ON storage.objects FOR SELECT
USING (bucket_id = 'contestant-media');
