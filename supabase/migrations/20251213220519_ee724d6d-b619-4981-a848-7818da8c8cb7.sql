-- Add image_url column to recipes table
ALTER TABLE public.recipes
ADD COLUMN image_url text;