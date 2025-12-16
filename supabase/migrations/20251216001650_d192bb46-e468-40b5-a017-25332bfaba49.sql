-- Create a single, secure workspace bootstrap to avoid RLS issues with INSERT ... RETURNING on organizations
-- This function creates: organization -> membership(owner) -> onboarding_progress

CREATE OR REPLACE FUNCTION public.create_workspace(_org_name text DEFAULT NULL)
RETURNS TABLE (org_id uuid, progress_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_progress_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create org
  INSERT INTO public.organizations (name)
  VALUES (_org_name)
  RETURNING id INTO v_org_id;

  -- Create membership (owner)
  INSERT INTO public.memberships (org_id, user_id, role)
  VALUES (v_org_id, auth.uid(), 'owner');

  -- Create onboarding progress
  INSERT INTO public.onboarding_progress (org_id, user_id, current_step, setup_health_score)
  VALUES (v_org_id, auth.uid(), 1, 0)
  RETURNING id INTO v_progress_id;

  org_id := v_org_id;
  progress_id := v_progress_id;
  RETURN NEXT;
END;
$$;

-- Allow authenticated users to call the function
GRANT EXECUTE ON FUNCTION public.create_workspace(text) TO authenticated;