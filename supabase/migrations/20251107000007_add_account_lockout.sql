-- Account Lockout System
-- Tracks failed login attempts and implements progressive lockout

-- Create failed_login_attempts table
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- Email or IP address
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('email', 'ip')),
  attempt_count INTEGER NOT NULL DEFAULT 1,
  first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ, -- NULL if not locked
  lockout_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_failed_login_identifier
  ON public.failed_login_attempts(identifier, identifier_type);

CREATE INDEX IF NOT EXISTS idx_failed_login_locked_until
  ON public.failed_login_attempts(locked_until)
  WHERE locked_until IS NOT NULL;

-- Enable RLS
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "Service role can manage failed login attempts"
  ON public.failed_login_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to record failed login attempt
CREATE OR REPLACE FUNCTION public.record_failed_login(
  _identifier TEXT,
  _identifier_type TEXT DEFAULT 'email'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _attempt_count INTEGER;
  _lockout_duration INTEGER; -- in seconds
  _locked_until TIMESTAMPTZ;
  _is_locked BOOLEAN;
  _existing_record RECORD;
BEGIN
  -- Validate identifier type
  IF _identifier_type NOT IN ('email', 'ip') THEN
    RAISE EXCEPTION 'Invalid identifier_type. Must be email or ip.';
  END IF;

  -- Get existing record if any
  SELECT * INTO _existing_record
  FROM public.failed_login_attempts
  WHERE identifier = _identifier
    AND identifier_type = _identifier_type
  ORDER BY last_attempt_at DESC
  LIMIT 1;

  -- Check if already locked
  IF _existing_record.locked_until IS NOT NULL
    AND _existing_record.locked_until > NOW() THEN
    -- Still locked
    RETURN jsonb_build_object(
      'is_locked', true,
      'attempt_count', _existing_record.attempt_count,
      'locked_until', _existing_record.locked_until,
      'retry_after_seconds', EXTRACT(EPOCH FROM (_existing_record.locked_until - NOW()))::INTEGER,
      'reason', _existing_record.lockout_reason
    );
  END IF;

  -- Reset if lockout period has passed or if last attempt was >1 hour ago
  IF _existing_record.locked_until IS NOT NULL
    AND _existing_record.locked_until <= NOW() THEN
    -- Lockout expired, reset
    DELETE FROM public.failed_login_attempts
    WHERE id = _existing_record.id;
    _existing_record := NULL;
  ELSIF _existing_record.last_attempt_at IS NOT NULL
    AND _existing_record.last_attempt_at < (NOW() - INTERVAL '1 hour') THEN
    -- More than 1 hour since last attempt, reset
    DELETE FROM public.failed_login_attempts
    WHERE id = _existing_record.id;
    _existing_record := NULL;
  END IF;

  -- Increment or create attempt record
  IF _existing_record IS NOT NULL THEN
    _attempt_count := _existing_record.attempt_count + 1;

    UPDATE public.failed_login_attempts
    SET
      attempt_count = _attempt_count,
      last_attempt_at = NOW(),
      updated_at = NOW()
    WHERE id = _existing_record.id;
  ELSE
    _attempt_count := 1;

    INSERT INTO public.failed_login_attempts (
      identifier,
      identifier_type,
      attempt_count,
      first_attempt_at,
      last_attempt_at
    ) VALUES (
      _identifier,
      _identifier_type,
      _attempt_count,
      NOW(),
      NOW()
    );
  END IF;

  -- Progressive lockout logic
  -- 3 attempts: 5 minutes
  -- 5 attempts: 15 minutes
  -- 7 attempts: 1 hour
  -- 10+ attempts: 24 hours
  _is_locked := false;
  _lockout_duration := 0;

  IF _attempt_count >= 10 THEN
    _lockout_duration := 86400; -- 24 hours
    _locked_until := NOW() + INTERVAL '24 hours';
    _is_locked := true;
  ELSIF _attempt_count >= 7 THEN
    _lockout_duration := 3600; -- 1 hour
    _locked_until := NOW() + INTERVAL '1 hour';
    _is_locked := true;
  ELSIF _attempt_count >= 5 THEN
    _lockout_duration := 900; -- 15 minutes
    _locked_until := NOW() + INTERVAL '15 minutes';
    _is_locked := true;
  ELSIF _attempt_count >= 3 THEN
    _lockout_duration := 300; -- 5 minutes
    _locked_until := NOW() + INTERVAL '5 minutes';
    _is_locked := true;
  END IF;

  -- Apply lockout if triggered
  IF _is_locked THEN
    UPDATE public.failed_login_attempts
    SET
      locked_until = _locked_until,
      lockout_reason = 'Too many failed login attempts',
      updated_at = NOW()
    WHERE identifier = _identifier
      AND identifier_type = _identifier_type;

    RETURN jsonb_build_object(
      'is_locked', true,
      'attempt_count', _attempt_count,
      'locked_until', _locked_until,
      'retry_after_seconds', _lockout_duration,
      'reason', 'Too many failed login attempts'
    );
  END IF;

  -- Not locked yet
  RETURN jsonb_build_object(
    'is_locked', false,
    'attempt_count', _attempt_count,
    'remaining_attempts', 3 - _attempt_count
  );
END;
$$;

-- Function to check if account/IP is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(
  _identifier TEXT,
  _identifier_type TEXT DEFAULT 'email'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _record RECORD;
BEGIN
  SELECT * INTO _record
  FROM public.failed_login_attempts
  WHERE identifier = _identifier
    AND identifier_type = _identifier_type
    AND locked_until IS NOT NULL
    AND locked_until > NOW()
  ORDER BY last_attempt_at DESC
  LIMIT 1;

  IF _record IS NOT NULL THEN
    RETURN jsonb_build_object(
      'is_locked', true,
      'attempt_count', _record.attempt_count,
      'locked_until', _record.locked_until,
      'retry_after_seconds', EXTRACT(EPOCH FROM (_record.locked_until - NOW()))::INTEGER,
      'reason', _record.lockout_reason
    );
  END IF;

  RETURN jsonb_build_object('is_locked', false);
END;
$$;

-- Function to clear failed attempts (on successful login)
CREATE OR REPLACE FUNCTION public.clear_failed_login_attempts(
  _identifier TEXT,
  _identifier_type TEXT DEFAULT 'email'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.failed_login_attempts
  WHERE identifier = _identifier
    AND identifier_type = _identifier_type;
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.record_failed_login TO service_role;
GRANT EXECUTE ON FUNCTION public.is_account_locked TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_failed_login_attempts TO service_role;

-- Add updated_at trigger
CREATE TRIGGER update_failed_login_attempts_updated_at
  BEFORE UPDATE ON public.failed_login_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.failed_login_attempts IS 'Tracks failed login attempts and implements progressive lockout';
COMMENT ON FUNCTION public.record_failed_login IS 'Records a failed login attempt and applies progressive lockout (3: 5min, 5: 15min, 7: 1hr, 10+: 24hr)';
COMMENT ON FUNCTION public.is_account_locked IS 'Checks if an email or IP is currently locked out';
COMMENT ON FUNCTION public.clear_failed_login_attempts IS 'Clears failed attempts on successful login';
