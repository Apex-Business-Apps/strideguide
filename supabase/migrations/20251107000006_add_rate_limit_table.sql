-- Rate Limiting Table and Functions
-- Implements sliding window rate limiting for auth endpoints

-- Create rate_limit_attempts table to track requests
CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address or user ID
  endpoint TEXT NOT NULL, -- e.g., 'auth/login', 'auth/signup'
  attempt_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier_endpoint
  ON public.rate_limit_attempts(identifier, endpoint, window_start);

-- Create index for cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limit_window_start
  ON public.rate_limit_attempts(window_start);

-- Enable RLS
ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate limit table
CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limit_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier TEXT,
  _endpoint TEXT,
  _max_attempts INTEGER DEFAULT 5,
  _window_seconds INTEGER DEFAULT 300 -- 5 minutes
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _current_count INTEGER;
  _window_start TIMESTAMPTZ;
  _is_limited BOOLEAN;
  _reset_at TIMESTAMPTZ;
BEGIN
  -- Calculate window start time
  _window_start := NOW() - (_window_seconds || ' seconds')::INTERVAL;

  -- Clean up old entries (older than 2x window)
  DELETE FROM public.rate_limit_attempts
  WHERE window_start < (NOW() - ((_window_seconds * 2) || ' seconds')::INTERVAL);

  -- Get current attempt count in window
  SELECT
    COALESCE(SUM(attempt_count), 0)::INTEGER,
    MIN(window_start)
  INTO _current_count, _window_start
  FROM public.rate_limit_attempts
  WHERE
    identifier = _identifier
    AND endpoint = _endpoint
    AND window_start >= (NOW() - (_window_seconds || ' seconds')::INTERVAL);

  -- Check if rate limit exceeded
  IF _current_count >= _max_attempts THEN
    _is_limited := true;
    _reset_at := _window_start + (_window_seconds || ' seconds')::INTERVAL;

    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', _current_count,
      'max_attempts', _max_attempts,
      'reset_at', _reset_at,
      'retry_after_seconds', EXTRACT(EPOCH FROM (_reset_at - NOW()))::INTEGER
    );
  END IF;

  -- Increment attempt count
  INSERT INTO public.rate_limit_attempts (
    identifier,
    endpoint,
    attempt_count,
    window_start,
    last_attempt
  ) VALUES (
    _identifier,
    _endpoint,
    1,
    NOW(),
    NOW()
  );

  _is_limited := false;
  _current_count := _current_count + 1;

  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', _current_count,
    'max_attempts', _max_attempts,
    'remaining', _max_attempts - _current_count
  );
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;

-- Add updated_at trigger
CREATE TRIGGER update_rate_limit_attempts_updated_at
  BEFORE UPDATE ON public.rate_limit_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.rate_limit_attempts IS 'Tracks rate limit attempts using sliding window algorithm';
COMMENT ON FUNCTION public.check_rate_limit IS 'Checks if request is within rate limit and increments counter. Returns allowed status and metadata.';
