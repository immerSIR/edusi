-- Create illustrations storage bucket for caching generated images
INSERT INTO storage.buckets (id, name, public)
VALUES ('illustrations', 'illustrations', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to illustrations
CREATE POLICY "Public read access for illustrations"
ON storage.objects FOR SELECT
USING (bucket_id = 'illustrations');

-- Allow backend to upload illustrations (service role bypasses RLS,
-- but this policy also allows authenticated users to upload if needed)
CREATE POLICY "Authenticated upload to illustrations"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'illustrations');
