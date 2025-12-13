-- Enable realtime for ingredient-vendor mapping tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.ingredient_vendor_maps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_items;