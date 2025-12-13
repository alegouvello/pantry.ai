-- Enable realtime for step 6-8 tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.integrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forecast_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reorder_rules;