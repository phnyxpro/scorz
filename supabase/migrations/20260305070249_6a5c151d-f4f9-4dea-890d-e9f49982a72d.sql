
-- Add document URL columns to competitions
ALTER TABLE public.competitions 
  ADD COLUMN IF NOT EXISTS rules_document_url text,
  ADD COLUMN IF NOT EXISTS rubric_document_url text;

-- Create documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policy for documents bucket
CREATE POLICY "Public can read documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- Authenticated admin/organizer can upload documents
CREATE POLICY "Admins and organizers can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'organizer'::public.app_role])
);

-- Authenticated admin/organizer can delete documents
CREATE POLICY "Admins and organizers can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'organizer'::public.app_role])
);
