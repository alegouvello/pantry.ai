-- Create storage bucket for recipe images
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view recipe images (public bucket)
CREATE POLICY "Recipe images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipe-images');

-- Allow authenticated users to upload recipe images
CREATE POLICY "Authenticated users can upload recipe images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'recipe-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their recipe images
CREATE POLICY "Authenticated users can update recipe images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'recipe-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete recipe images
CREATE POLICY "Authenticated users can delete recipe images"
ON storage.objects FOR DELETE
USING (bucket_id = 'recipe-images' AND auth.role() = 'authenticated');