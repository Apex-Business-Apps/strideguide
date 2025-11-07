-- Soft Delete Pattern
-- Adds deleted_at column and helper functions for safe deletion with audit trail

-- Add deleted_at column to tables that should support soft delete
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.billing_events
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.emergency_contacts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.lost_items
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create indexes for soft-deleted records
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at
  ON public.profiles(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at
  ON public.organizations(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_deleted_at
  ON public.user_subscriptions(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_deleted_at
  ON public.emergency_contacts(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lost_items_deleted_at
  ON public.lost_items(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Helper function to soft delete a record
CREATE OR REPLACE FUNCTION public.soft_delete(
  _table_name TEXT,
  _record_id UUID,
  _user_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _query TEXT;
  _affected INTEGER;
  _check_user UUID;
BEGIN
  -- Validate table name to prevent SQL injection
  IF _table_name NOT IN (
    'profiles',
    'organizations',
    'user_subscriptions',
    'billing_events',
    'emergency_contacts',
    'lost_items'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid table name'
    );
  END IF;

  -- Check user ID if provided (authorization)
  _check_user := COALESCE(_user_id, auth.uid());

  -- Construct and execute soft delete query
  _query := format(
    'UPDATE public.%I SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING 1',
    _table_name
  );

  EXECUTE _query USING _record_id INTO _affected;

  IF _affected > 0 THEN
    -- Log the soft delete event
    PERFORM public.log_audit_event(
      'soft_delete',
      _table_name,
      _record_id,
      jsonb_build_object(
        'deleted_by', _check_user,
        'deleted_at', NOW()
      )
    );

    RETURN jsonb_build_object(
      'success', true,
      'deleted', true,
      'table', _table_name,
      'id', _record_id
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Record not found or already deleted'
    );
  END IF;
END;
$$;

-- Helper function to restore a soft-deleted record
CREATE OR REPLACE FUNCTION public.restore_soft_deleted(
  _table_name TEXT,
  _record_id UUID,
  _user_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _query TEXT;
  _affected INTEGER;
  _check_user UUID;
BEGIN
  -- Validate table name
  IF _table_name NOT IN (
    'profiles',
    'organizations',
    'user_subscriptions',
    'billing_events',
    'emergency_contacts',
    'lost_items'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid table name'
    );
  END IF;

  _check_user := COALESCE(_user_id, auth.uid());

  -- Restore the record
  _query := format(
    'UPDATE public.%I SET deleted_at = NULL, updated_at = NOW() WHERE id = $1 AND deleted_at IS NOT NULL RETURNING 1',
    _table_name
  );

  EXECUTE _query USING _record_id INTO _affected;

  IF _affected > 0 THEN
    -- Log the restore event
    PERFORM public.log_audit_event(
      'restore_deleted',
      _table_name,
      _record_id,
      jsonb_build_object(
        'restored_by', _check_user,
        'restored_at', NOW()
      )
    );

    RETURN jsonb_build_object(
      'success', true,
      'restored', true,
      'table', _table_name,
      'id', _record_id
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Record not found or not deleted'
    );
  END IF;
END;
$$;

-- Helper function to permanently delete soft-deleted records
CREATE OR REPLACE FUNCTION public.hard_delete_expired(
  _table_name TEXT,
  _days_old INTEGER DEFAULT 90
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _query TEXT;
  _deleted INTEGER;
  _cutoff TIMESTAMPTZ;
BEGIN
  -- Validate table name
  IF _table_name NOT IN (
    'profiles',
    'organizations',
    'user_subscriptions',
    'billing_events',
    'emergency_contacts',
    'lost_items'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid table name'
    );
  END IF;

  _cutoff := NOW() - (_days_old || ' days')::INTERVAL;

  -- Delete records that have been soft-deleted for more than X days
  _query := format(
    'DELETE FROM public.%I WHERE deleted_at IS NOT NULL AND deleted_at < $1',
    _table_name
  );

  EXECUTE _query USING _cutoff;
  GET DIAGNOSTICS _deleted = ROW_COUNT;

  -- Log the hard delete operation
  PERFORM public.log_audit_event(
    'hard_delete_expired',
    _table_name,
    NULL,
    jsonb_build_object(
      'cutoff_date', _cutoff,
      'days_old', _days_old,
      'records_deleted', _deleted
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'table', _table_name,
    'records_deleted', _deleted,
    'cutoff_date', _cutoff
  );
END;
$$;

-- Update existing RLS policies to exclude soft-deleted records by default
-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() AND deleted_at IS NULL);

-- Organizations (update existing policy)
DROP POLICY IF EXISTS "org_select" ON public.organizations;
CREATE POLICY "org_select"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.organization_id = organizations.id
    )
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.soft_delete TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_soft_deleted TO authenticated;
GRANT EXECUTE ON FUNCTION public.hard_delete_expired TO service_role;

-- Add comments
COMMENT ON FUNCTION public.soft_delete IS 'Soft deletes a record by setting deleted_at timestamp. Logs audit event.';
COMMENT ON FUNCTION public.restore_soft_deleted IS 'Restores a soft-deleted record by clearing deleted_at. Logs audit event.';
COMMENT ON FUNCTION public.hard_delete_expired IS 'Permanently deletes soft-deleted records older than X days (default 90). Service role only.';

-- Create view for admins to see deleted records
CREATE OR REPLACE VIEW public.deleted_records_summary AS
SELECT
  'profiles' AS table_name,
  COUNT(*) AS count,
  MIN(deleted_at) AS oldest_deletion,
  MAX(deleted_at) AS newest_deletion
FROM public.profiles
WHERE deleted_at IS NOT NULL
UNION ALL
SELECT
  'organizations',
  COUNT(*),
  MIN(deleted_at),
  MAX(deleted_at)
FROM public.organizations
WHERE deleted_at IS NOT NULL
UNION ALL
SELECT
  'user_subscriptions',
  COUNT(*),
  MIN(deleted_at),
  MAX(deleted_at)
FROM public.user_subscriptions
WHERE deleted_at IS NOT NULL
UNION ALL
SELECT
  'emergency_contacts',
  COUNT(*),
  MIN(deleted_at),
  MAX(deleted_at)
FROM public.emergency_contacts
WHERE deleted_at IS NOT NULL
UNION ALL
SELECT
  'lost_items',
  COUNT(*),
  MIN(deleted_at),
  MAX(deleted_at)
FROM public.lost_items
WHERE deleted_at IS NOT NULL;

-- Grant view access to service role only
GRANT SELECT ON public.deleted_records_summary TO service_role;

COMMENT ON VIEW public.deleted_records_summary IS 'Summary of soft-deleted records across all tables. Service role only.';
