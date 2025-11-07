-- Comprehensive RLS Policies for Organizations
-- Adds missing INSERT, UPDATE, DELETE policies with proper access control

-- Drop existing incomplete policies
DROP POLICY IF EXISTS "Organization owners can update their organizations" ON public.organizations;

-- Organizations policies - Complete CRUD
-- SELECT: Members can view their organizations
CREATE POLICY "org_select"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.organization_id = organizations.id
    )
  );

-- INSERT: Authenticated users can create organizations (they become owner)
CREATE POLICY "org_insert"
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- UPDATE: Only owners or admins can update
CREATE POLICY "org_update"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.organization_id = organizations.id
        AND user_roles.role IN ('admin', 'super-admin')
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.organization_id = organizations.id
        AND user_roles.role IN ('admin', 'super-admin')
    )
  );

-- DELETE: Only owners can delete organizations
CREATE POLICY "org_delete"
  ON public.organizations
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- User Roles - Complete CRUD policies
-- (Some policies exist, but adding missing ones)

-- INSERT: Only admins can add new members to organization
DROP POLICY IF EXISTS "Users can insert their own user roles" ON public.user_roles;

CREATE POLICY "user_roles_insert"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be admin of the organization
    EXISTS (
      SELECT 1 FROM public.user_roles existing
      WHERE existing.user_id = auth.uid()
        AND existing.organization_id = user_roles.organization_id
        AND existing.role IN ('admin', 'super-admin', 'owner')
    )
    -- Or it's the first user (organization owner setting up)
    OR NOT EXISTS (
      SELECT 1 FROM public.user_roles existing
      WHERE existing.organization_id = user_roles.organization_id
    )
  );

-- UPDATE: Only admins can update roles (and can't demote themselves)
CREATE POLICY "user_roles_update"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles admin
      WHERE admin.user_id = auth.uid()
        AND admin.organization_id = user_roles.organization_id
        AND admin.role IN ('admin', 'super-admin', 'owner')
    )
    AND user_id != auth.uid() -- Can't update own role
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles admin
      WHERE admin.user_id = auth.uid()
        AND admin.organization_id = user_roles.organization_id
        AND admin.role IN ('admin', 'super-admin', 'owner')
    )
    AND user_id != auth.uid()
  );

-- DELETE: Only admins can remove members (except themselves)
CREATE POLICY "user_roles_delete"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles admin
      WHERE admin.user_id = auth.uid()
        AND admin.organization_id = user_roles.organization_id
        AND admin.role IN ('admin', 'super-admin', 'owner')
    )
    AND user_id != auth.uid() -- Can't remove self
  );

-- API Usage - Complete policies
DROP POLICY IF EXISTS "Users can view their own API usage" ON public.api_usage;

CREATE POLICY "api_usage_select"
  ON public.api_usage
  FOR SELECT
  TO authenticated
  USING (
    -- Own usage
    user_id = auth.uid()
    -- Or admin of the organization
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.organization_id = api_usage.organization_id
        AND user_roles.role IN ('admin', 'super-admin', 'owner')
    )
  );

CREATE POLICY "api_usage_insert"
  ON public.api_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      organization_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = auth.uid()
          AND user_roles.organization_id = api_usage.organization_id
      )
    )
  );

-- No UPDATE or DELETE for API usage (audit trail)

-- Billing Events - Complete policies
CREATE POLICY "billing_events_insert"
  ON public.billing_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- No UPDATE or DELETE for billing events (audit trail)

-- Helper function: Check if user is org admin
CREATE OR REPLACE FUNCTION public.is_org_admin(
  _user_id UUID,
  _org_id UUID
) RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role IN ('admin', 'super-admin', 'owner')
  );
$$;

-- Helper function: Check if user is org member
CREATE OR REPLACE FUNCTION public.is_org_member(
  _user_id UUID,
  _org_id UUID
) RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_org_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member TO authenticated;

-- Add comments
COMMENT ON POLICY "org_select" ON public.organizations IS 'Members can view their organizations';
COMMENT ON POLICY "org_insert" ON public.organizations IS 'Authenticated users can create organizations (become owner)';
COMMENT ON POLICY "org_update" ON public.organizations IS 'Only owners and admins can update organization';
COMMENT ON POLICY "org_delete" ON public.organizations IS 'Only owners can delete organizations';

COMMENT ON FUNCTION public.is_org_admin IS 'Checks if user is admin/super-admin/owner of organization';
COMMENT ON FUNCTION public.is_org_member IS 'Checks if user is a member of organization';
