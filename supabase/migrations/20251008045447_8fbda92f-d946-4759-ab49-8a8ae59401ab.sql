-- Phase 2: Audit Log Deduplication for Rate Limit Events
-- Purpose: Prevent flood of identical rate_limit_exceeded logs within 1-minute windows

-- Create a helper function that logs audit events with deduplication
CREATE OR REPLACE FUNCTION public.log_audit_event_deduplicated(
  _user_id uuid,
  _event_type text,
  _severity text,
  _event_data jsonb DEFAULT '{}'::jsonb,
  _dedup_window_seconds integer DEFAULT 60
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _event_id uuid;
  _recent_log_exists boolean;
BEGIN
  -- For rate_limit_exceeded events, check if a recent log exists
  IF _event_type = 'rate_limit_exceeded' THEN
    SELECT EXISTS (
      SELECT 1
      FROM security_audit_log
      WHERE user_id = _user_id
        AND event_type = 'rate_limit_exceeded'
        AND event_data->>'endpoint' = _event_data->>'endpoint'
        AND created_at > (now() - (_dedup_window_seconds || ' seconds')::interval)
    ) INTO _recent_log_exists;
    
    -- If recent log exists, return early without inserting
    IF _recent_log_exists THEN
      RETURN NULL;
    END IF;
  END IF;
  
  -- Insert the audit log entry
  INSERT INTO public.security_audit_log (
    user_id,
    event_type,
    severity,
    event_data
  )
  VALUES (
    _user_id,
    _event_type,
    _severity,
    _event_data
  )
  RETURNING id INTO _event_id;
  
  RETURN _event_id;
END;
$function$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.log_audit_event_deduplicated TO authenticated, service_role;