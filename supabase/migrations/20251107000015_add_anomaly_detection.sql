-- Anomaly Detection for Login Behavior
-- Detects unusual login patterns and triggers security alerts

-- Create login history table for pattern analysis
CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  country_code CHAR(2), -- ISO 3166-1 alpha-2
  city TEXT,
  device_type TEXT, -- mobile, desktop, tablet
  browser TEXT,
  os TEXT,
  is_suspicious BOOLEAN NOT NULL DEFAULT false,
  anomaly_score DECIMAL(3,2) DEFAULT 0.0, -- 0.0 to 1.0
  anomaly_reasons TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create security alerts table
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'unusual_location',
    'unusual_time',
    'unusual_device',
    'rapid_attempts',
    'impossible_travel',
    'new_device',
    'multiple_failures'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user device fingerprints for trusted devices
CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL, -- Hash of user agent + canvas fingerprint
  device_name TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_trusted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_fingerprint)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_login_history_user_created
  ON public.login_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_history_ip
  ON public.login_history(ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_history_suspicious
  ON public.login_history(is_suspicious, created_at DESC)
  WHERE is_suspicious = true;

CREATE INDEX IF NOT EXISTS idx_security_alerts_user_created
  ON public.security_alerts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_alerts_acknowledged
  ON public.security_alerts(acknowledged, created_at DESC)
  WHERE acknowledged = false;

CREATE INDEX IF NOT EXISTS idx_trusted_devices_user
  ON public.trusted_devices(user_id, is_trusted);

-- Enable RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own login history"
  ON public.login_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view their own security alerts"
  ON public.security_alerts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can acknowledge their own alerts"
  ON public.security_alerts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their trusted devices"
  ON public.trusted_devices
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role can insert login history and alerts
CREATE POLICY "Service role can insert login history"
  ON public.login_history
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can insert security alerts"
  ON public.security_alerts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Function to analyze login and detect anomalies
CREATE OR REPLACE FUNCTION public.analyze_login(
  _user_id UUID,
  _ip_address INET,
  _user_agent TEXT,
  _success BOOLEAN,
  _country_code CHAR(2) DEFAULT NULL,
  _city TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _anomaly_score DECIMAL := 0.0;
  _anomaly_reasons TEXT[] := '{}';
  _is_suspicious BOOLEAN := false;
  _severity TEXT := 'low';
  _user_history RECORD;
  _device_fingerprint TEXT;
  _trusted_device BOOLEAN := false;
BEGIN
  -- Generate device fingerprint (simple hash of user agent)
  _device_fingerprint := md5(_user_agent);

  -- Check if device is trusted
  SELECT is_trusted INTO _trusted_device
  FROM public.trusted_devices
  WHERE user_id = _user_id
    AND device_fingerprint = _device_fingerprint;

  IF _trusted_device THEN
    -- Update last seen
    UPDATE public.trusted_devices
    SET last_seen_at = NOW(), updated_at = NOW()
    WHERE user_id = _user_id AND device_fingerprint = _device_fingerprint;
  ELSE
    -- New device detected
    _anomaly_score := _anomaly_score + 0.3;
    _anomaly_reasons := array_append(_anomaly_reasons, 'new_device');

    -- Insert new device
    INSERT INTO public.trusted_devices (
      user_id, device_fingerprint, device_name
    ) VALUES (
      _user_id, _device_fingerprint, LEFT(_user_agent, 100)
    ) ON CONFLICT (user_id, device_fingerprint)
    DO UPDATE SET last_seen_at = NOW(), updated_at = NOW();
  END IF;

  -- Get user's login history
  SELECT
    COUNT(*) AS total_logins,
    COUNT(DISTINCT ip_address) AS unique_ips,
    COUNT(DISTINCT country_code) AS unique_countries,
    MAX(created_at) AS last_login
  INTO _user_history
  FROM public.login_history
  WHERE user_id = _user_id
    AND created_at >= NOW() - INTERVAL '30 days'
    AND success = true;

  -- Check 1: Unusual location (new country)
  IF _country_code IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.login_history
      WHERE user_id = _user_id
        AND country_code = _country_code
        AND success = true
        AND created_at >= NOW() - INTERVAL '90 days'
    ) THEN
      _anomaly_score := _anomaly_score + 0.4;
      _anomaly_reasons := array_append(_anomaly_reasons, 'unusual_location');
      _severity := 'medium';
    END IF;
  END IF;

  -- Check 2: Impossible travel (logged in from different location < 1 hour ago)
  IF EXISTS (
    SELECT 1 FROM public.login_history
    WHERE user_id = _user_id
      AND ip_address != _ip_address
      AND created_at >= NOW() - INTERVAL '1 hour'
      AND success = true
  ) THEN
    _anomaly_score := _anomaly_score + 0.5;
    _anomaly_reasons := array_append(_anomaly_reasons, 'impossible_travel');
    _severity := 'high';
  END IF;

  -- Check 3: Rapid failed attempts
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT COUNT(*) as failures
      FROM public.login_history
      WHERE user_id = _user_id
        AND created_at >= NOW() - INTERVAL '15 minutes'
        AND success = false
    ) t
    WHERE t.failures >= 3
  ) THEN
    _anomaly_score := _anomaly_score + 0.4;
    _anomaly_reasons := array_append(_anomaly_reasons, 'rapid_attempts');
    _severity := 'high';
  END IF;

  -- Check 4: Unusual time (login at 2-6 AM local time)
  -- Simplified check - would need timezone data for accurate detection
  DECLARE
    _hour INTEGER;
  BEGIN
    _hour := EXTRACT(HOUR FROM NOW());
    IF _hour >= 2 AND _hour <= 6 THEN
      _anomaly_score := _anomaly_score + 0.2;
      _anomaly_reasons := array_append(_anomaly_reasons, 'unusual_time');
    END IF;
  END;

  -- Determine if suspicious
  _is_suspicious := _anomaly_score >= 0.5;

  -- Insert login history
  INSERT INTO public.login_history (
    user_id,
    success,
    ip_address,
    user_agent,
    country_code,
    city,
    is_suspicious,
    anomaly_score,
    anomaly_reasons
  ) VALUES (
    _user_id,
    _success,
    _ip_address,
    _user_agent,
    _country_code,
    _city,
    _is_suspicious,
    _anomaly_score,
    _anomaly_reasons
  );

  -- Create security alert if suspicious
  IF _is_suspicious AND _success THEN
    INSERT INTO public.security_alerts (
      user_id,
      alert_type,
      severity,
      description,
      metadata
    ) VALUES (
      _user_id,
      _anomaly_reasons[1], -- Primary anomaly reason
      _severity,
      format(
        'Suspicious login detected from %s. Anomaly score: %.2f',
        _ip_address::TEXT,
        _anomaly_score
      ),
      jsonb_build_object(
        'ip_address', _ip_address::TEXT,
        'country_code', _country_code,
        'city', _city,
        'anomaly_score', _anomaly_score,
        'anomaly_reasons', _anomaly_reasons
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'is_suspicious', _is_suspicious,
    'anomaly_score', _anomaly_score,
    'anomaly_reasons', _anomaly_reasons,
    'severity', _severity,
    'trusted_device', COALESCE(_trusted_device, false)
  );
END;
$$;

-- Function to get user security summary
CREATE OR REPLACE FUNCTION public.get_security_summary(_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _check_user UUID;
  _unacknowledged_alerts INTEGER;
  _suspicious_logins INTEGER;
  _trusted_devices INTEGER;
  _last_suspicious_login TIMESTAMPTZ;
BEGIN
  _check_user := COALESCE(_user_id, auth.uid());

  IF _check_user IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- Count unacknowledged alerts
  SELECT COUNT(*) INTO _unacknowledged_alerts
  FROM public.security_alerts
  WHERE user_id = _check_user
    AND acknowledged = false;

  -- Count suspicious logins in last 30 days
  SELECT
    COUNT(*),
    MAX(created_at)
  INTO _suspicious_logins, _last_suspicious_login
  FROM public.login_history
  WHERE user_id = _check_user
    AND is_suspicious = true
    AND created_at >= NOW() - INTERVAL '30 days';

  -- Count trusted devices
  SELECT COUNT(*) INTO _trusted_devices
  FROM public.trusted_devices
  WHERE user_id = _check_user
    AND is_trusted = true;

  RETURN jsonb_build_object(
    'unacknowledged_alerts', _unacknowledged_alerts,
    'suspicious_logins_30d', _suspicious_logins,
    'last_suspicious_login', _last_suspicious_login,
    'trusted_devices_count', _trusted_devices,
    'mfa_enabled', public.is_mfa_enabled(_check_user)
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.analyze_login TO service_role;
GRANT EXECUTE ON FUNCTION public.get_security_summary TO authenticated;

-- Add triggers
CREATE TRIGGER update_trusted_devices_updated_at
  BEFORE UPDATE ON public.trusted_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.login_history IS 'Complete login history with anomaly detection scores';
COMMENT ON TABLE public.security_alerts IS 'Security alerts triggered by anomaly detection';
COMMENT ON TABLE public.trusted_devices IS 'User devices that have been verified as trusted';
COMMENT ON FUNCTION public.analyze_login IS 'Analyzes login attempt and detects anomalies. Returns anomaly score and reasons.';
COMMENT ON FUNCTION public.get_security_summary IS 'Returns security summary for user (alerts, suspicious logins, trusted devices)';
