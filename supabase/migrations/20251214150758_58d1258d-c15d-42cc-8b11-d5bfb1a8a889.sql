-- Drop the restrictive INSERT policy for ingredients
DROP POLICY IF EXISTS "Managers can manage ingredients" ON public.ingredients;

-- Create a new policy that allows any authenticated user with a role to insert ingredients
-- This is needed for onboarding flow where users set up their restaurant
CREATE POLICY "Team can create ingredients" 
ON public.ingredients 
FOR INSERT 
WITH CHECK (has_any_role(auth.uid()));

-- Also update the handle_new_user function to assign 'manager' role by default
-- since the first user setting up a restaurant should have full access
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Assign manager role by default (restaurant owners should have full access)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'manager');
  
  RETURN NEW;
END;
$function$;