-- Fix infinite recursion in user_roles RLS policy
-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view roles in their organizations" ON public.user_roles;

-- Create non-recursive policy: users can only view their own roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

-- Add separate policy for admins to view all roles in their organization
-- This uses a function to avoid recursion
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND organization_id = org_id 
    AND role IN ('admin', 'super-admin')
  );
$$;

-- Policy for admins to view all roles in their organizations
CREATE POLICY "Admins can view all roles in their organizations" 
ON public.user_roles 
FOR SELECT 
USING (
  organization_id IS NOT NULL 
  AND public.is_org_admin(organization_id)
);

-- Add policy for inserting roles (users cannot insert their own admin roles)
CREATE POLICY "Users can insert their own user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() 
  AND role = 'user'
);

-- Add policy for admins to manage roles
CREATE POLICY "Admins can manage roles in their organizations" 
ON public.user_roles 
FOR ALL 
USING (
  organization_id IS NOT NULL 
  AND public.is_org_admin(organization_id)
);