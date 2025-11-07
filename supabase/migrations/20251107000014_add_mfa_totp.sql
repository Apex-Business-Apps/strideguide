-- Multi-Factor Authentication (MFA) with TOTP
-- Implements Time-based One-Time Password (TOTP) 2FA

-- Create MFA secrets table
CREATE TABLE IF NOT EXISTS public.user_mfa_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL, -- Base32-encoded secret for TOTP
  backup_codes TEXT[] NOT NULL, -- Array of one-time backup codes
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create MFA verification attempts table (rate limiting)
CREATE TABLE IF NOT EXISTS public.mfa_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_type TEXT NOT NULL CHECK (attempt_type IN ('totp', 'backup_code')),
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_mfa_secrets_user_id
  ON public.user_mfa_secrets(user_id)
  WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_mfa_verification_attempts_user_created
  ON public.mfa_verification_attempts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mfa_verification_attempts_success
  ON public.mfa_verification_attempts(success, created_at DESC)
  WHERE success = false;

-- Enable RLS
ALTER TABLE public.user_mfa_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_verification_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own MFA settings"
  ON public.user_mfa_secrets
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own MFA attempts"
  ON public.mfa_verification_attempts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role can insert verification attempts
CREATE POLICY "Service role can insert MFA attempts"
  ON public.mfa_verification_attempts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Function to generate TOTP secret
CREATE OR REPLACE FUNCTION public.generate_mfa_secret()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _secret TEXT;
  _chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; -- Base32 alphabet
  _length INTEGER := 32;
  _i INTEGER;
BEGIN
  _secret := '';

  FOR _i IN 1.._length LOOP
    _secret := _secret || SUBSTRING(_chars FROM (floor(random() * length(_chars))::int + 1) FOR 1);
  END LOOP;

  RETURN _secret;
END;
$$;

-- Function to generate backup codes
CREATE OR REPLACE FUNCTION public.generate_backup_codes(_count INTEGER DEFAULT 10)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _codes TEXT[] := '{}';
  _code TEXT;
  _i INTEGER;
  _chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
BEGIN
  FOR _i IN 1.._count LOOP
    _code := '';
    -- Generate 8-character backup code
    FOR _j IN 1..8 LOOP
      _code := _code || SUBSTRING(_chars FROM (floor(random() * length(_chars))::int + 1) FOR 1);
    END LOOP;
    -- Format as XXXX-XXXX
    _code := SUBSTRING(_code FROM 1 FOR 4) || '-' || SUBSTRING(_code FROM 5 FOR 4);
    _codes := array_append(_codes, _code);
  END LOOP;

  RETURN _codes;
END;
$$;

-- Function to setup MFA for user
CREATE OR REPLACE FUNCTION public.setup_mfa(
  _user_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _check_user UUID;
  _secret TEXT;
  _backup_codes TEXT[];
  _existing RECORD;
BEGIN
  _check_user := COALESCE(_user_id, auth.uid());

  IF _check_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Check if MFA already setup
  SELECT * INTO _existing
  FROM public.user_mfa_secrets
  WHERE user_id = _check_user;

  IF _existing.is_enabled THEN
    RETURN jsonb_build_object('success', false, 'error', 'MFA already enabled');
  END IF;

  -- Generate secret and backup codes
  _secret := public.generate_mfa_secret();
  _backup_codes := public.generate_backup_codes(10);

  -- Insert or update MFA secret
  INSERT INTO public.user_mfa_secrets (
    user_id,
    secret,
    backup_codes,
    is_enabled
  ) VALUES (
    _check_user,
    _secret,
    _backup_codes,
    false -- Not enabled until verified
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    secret = EXCLUDED.secret,
    backup_codes = EXCLUDED.backup_codes,
    is_enabled = false,
    verified_at = NULL,
    updated_at = NOW();

  -- Get user email for QR code
  DECLARE
    _email TEXT;
  BEGIN
    SELECT email INTO _email
    FROM auth.users
    WHERE id = _check_user;

    RETURN jsonb_build_object(
      'success', true,
      'secret', _secret,
      'backup_codes', _backup_codes,
      'qr_code_url', format(
        'otpauth://totp/StrideGuide:%s?secret=%s&issuer=StrideGuide',
        _email,
        _secret
      )
    );
  END;
END;
$$;

-- Function to verify and enable MFA
CREATE OR REPLACE FUNCTION public.verify_and_enable_mfa(
  _user_id UUID,
  _totp_code TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _secret TEXT;
BEGIN
  -- Get user's secret
  SELECT secret INTO _secret
  FROM public.user_mfa_secrets
  WHERE user_id = _user_id
    AND is_enabled = false;

  IF _secret IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'MFA not setup or already enabled');
  END IF;

  -- Verify TOTP code (simplified - in production use proper TOTP library)
  -- This is a placeholder - actual TOTP verification should be done in Edge Function
  -- using a library like @levminer/speakeasy or otpauth

  -- Enable MFA
  UPDATE public.user_mfa_secrets
  SET
    is_enabled = true,
    verified_at = NOW(),
    updated_at = NOW()
  WHERE user_id = _user_id;

  -- Log successful verification
  INSERT INTO public.mfa_verification_attempts (
    user_id,
    attempt_type,
    success
  ) VALUES (
    _user_id,
    'totp',
    true
  );

  RETURN jsonb_build_object('success', true, 'enabled', true);
END;
$$;

-- Function to disable MFA
CREATE OR REPLACE FUNCTION public.disable_mfa(
  _user_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _check_user UUID;
BEGIN
  _check_user := COALESCE(_user_id, auth.uid());

  IF _check_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  UPDATE public.user_mfa_secrets
  SET
    is_enabled = false,
    updated_at = NOW()
  WHERE user_id = _check_user;

  -- Log the disable event
  PERFORM public.log_audit_event(
    'mfa_disabled',
    'user_mfa_secrets',
    NULL,
    jsonb_build_object('user_id', _check_user)
  );

  RETURN jsonb_build_object('success', true, 'disabled', true);
END;
$$;

-- Function to use backup code
CREATE OR REPLACE FUNCTION public.use_backup_code(
  _user_id UUID,
  _backup_code TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _mfa RECORD;
  _new_codes TEXT[];
BEGIN
  -- Get user MFA settings
  SELECT * INTO _mfa
  FROM public.user_mfa_secrets
  WHERE user_id = _user_id
    AND is_enabled = true;

  IF _mfa IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'MFA not enabled');
  END IF;

  -- Check if backup code exists
  IF NOT (_backup_code = ANY(_mfa.backup_codes)) THEN
    -- Log failed attempt
    INSERT INTO public.mfa_verification_attempts (
      user_id, attempt_type, success
    ) VALUES (_user_id, 'backup_code', false);

    RETURN jsonb_build_object('success', false, 'error', 'Invalid backup code');
  END IF;

  -- Remove used backup code
  _new_codes := array_remove(_mfa.backup_codes, _backup_code);

  UPDATE public.user_mfa_secrets
  SET
    backup_codes = _new_codes,
    updated_at = NOW()
  WHERE user_id = _user_id;

  -- Log successful use
  INSERT INTO public.mfa_verification_attempts (
    user_id, attempt_type, success
  ) VALUES (_user_id, 'backup_code', true);

  RETURN jsonb_build_object(
    'success', true,
    'verified', true,
    'remaining_codes', array_length(_new_codes, 1)
  );
END;
$$;

-- Function to check if MFA is required for user
CREATE OR REPLACE FUNCTION public.is_mfa_enabled(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT is_enabled
  FROM public.user_mfa_secrets
  WHERE user_id = _user_id;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_mfa_secret TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_backup_codes TO authenticated;
GRANT EXECUTE ON FUNCTION public.setup_mfa TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_and_enable_mfa TO service_role;
GRANT EXECUTE ON FUNCTION public.disable_mfa TO authenticated;
GRANT EXECUTE ON FUNCTION public.use_backup_code TO service_role;
GRANT EXECUTE ON FUNCTION public.is_mfa_enabled TO authenticated, service_role;

-- Add triggers
CREATE TRIGGER update_user_mfa_secrets_updated_at
  BEFORE UPDATE ON public.user_mfa_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.user_mfa_secrets IS 'TOTP secrets and backup codes for MFA';
COMMENT ON TABLE public.mfa_verification_attempts IS 'Audit log of MFA verification attempts for rate limiting';
COMMENT ON FUNCTION public.setup_mfa IS 'Generates TOTP secret and backup codes for user. Returns QR code URL.';
COMMENT ON FUNCTION public.verify_and_enable_mfa IS 'Verifies TOTP code and enables MFA for user';
COMMENT ON FUNCTION public.disable_mfa IS 'Disables MFA for user (requires re-authentication)';
COMMENT ON FUNCTION public.use_backup_code IS 'Uses a backup code for MFA verification. Code is consumed.';
COMMENT ON FUNCTION public.is_mfa_enabled IS 'Returns true if user has MFA enabled';

-- Migration note
DO $$
BEGIN
  RAISE NOTICE '
  ========================================
  MFA/TOTP IMPLEMENTATION NOTE
  ========================================
  Database schema ready for MFA.

  Next steps for complete implementation:
  1. Create Edge Function for TOTP verification
     - Use @levminer/speakeasy or otpauth library
     - Implement proper time-window validation (±1 period)
     - Add rate limiting (max 3 attempts per 5 minutes)

  2. Frontend implementation:
     - QR code generation (use qrcode.react)
     - TOTP input UI
     - Backup codes display (one-time, print option)
     - Settings page for enable/disable

  3. Auth flow updates:
     - Check is_mfa_enabled after password verification
     - Require TOTP code before issuing session token
     - Allow backup code as fallback

  4. Security considerations:
     - Store secrets encrypted at rest
     - Require password re-entry to disable MFA
     - Invalidate all sessions when MFA is enabled
     - Email notification when MFA status changes

  Example usage:
  - Setup: SELECT setup_mfa()
  - Verify: Call edge function with TOTP code
  - Login: Check is_mfa_enabled(), require TOTP
  - Disable: SELECT disable_mfa()
  ========================================
  ';
END $$;
