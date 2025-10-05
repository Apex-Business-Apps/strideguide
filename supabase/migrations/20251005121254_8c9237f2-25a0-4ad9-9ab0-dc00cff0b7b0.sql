-- Create admin user role assignment function
-- This function allows manual admin role assignment for the first admin user

CREATE OR REPLACE FUNCTION public.assign_admin_role(target_user_id uuid, target_role text DEFAULT 'admin')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert admin role for user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, target_role::text)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the role assignment
  INSERT INTO public.security_audit_log (
    user_id,
    event_type,
    severity,
    event_data
  ) VALUES (
    target_user_id,
    'admin_role_assigned',
    'info',
    jsonb_build_object('role', target_role)
  );
  
  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users (for self-service admin setup)
GRANT EXECUTE ON FUNCTION public.assign_admin_role(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.assign_admin_role IS 'Assigns admin role to a user. Use this for initial admin setup. In production, restrict this function.';
