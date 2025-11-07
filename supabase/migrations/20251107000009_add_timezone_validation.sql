-- Timezone Validation
-- Adds timezone column to profiles with validation against IANA timezone database

-- Add timezone column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Toronto' CHECK (
    timezone IN (
      SELECT name FROM pg_timezone_names
    )
  );

-- Create index for timezone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_timezone
  ON public.profiles(timezone);

-- Function to validate and set user timezone
CREATE OR REPLACE FUNCTION public.set_user_timezone(
  _user_id UUID,
  _timezone TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _is_valid BOOLEAN;
BEGIN
  -- Validate timezone exists in PostgreSQL timezone database
  SELECT EXISTS (
    SELECT 1 FROM pg_timezone_names WHERE name = _timezone
  ) INTO _is_valid;

  IF NOT _is_valid THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid timezone. Must be a valid IANA timezone name.',
      'example', 'America/Toronto'
    );
  END IF;

  -- Check if user can update this profile
  IF auth.uid() != _user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized'
    );
  END IF;

  -- Update timezone
  UPDATE public.profiles
  SET
    timezone = _timezone,
    updated_at = NOW()
  WHERE id = _user_id;

  RETURN jsonb_build_object(
    'success', true,
    'timezone', _timezone
  );
END;
$$;

-- Function to get user's local time
CREATE OR REPLACE FUNCTION public.get_user_local_time(
  _user_id UUID DEFAULT NULL
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _timezone TEXT;
  _user_to_check UUID;
BEGIN
  _user_to_check := COALESCE(_user_id, auth.uid());

  IF _user_to_check IS NULL THEN
    RETURN NOW();
  END IF;

  -- Get user's timezone
  SELECT timezone INTO _timezone
  FROM public.profiles
  WHERE id = _user_to_check;

  -- Return current time in user's timezone
  IF _timezone IS NOT NULL THEN
    RETURN NOW() AT TIME ZONE _timezone;
  END IF;

  -- Default to UTC
  RETURN NOW();
END;
$$;

-- Function to list common timezones for Canada
CREATE OR REPLACE FUNCTION public.get_canadian_timezones()
RETURNS TABLE (
  timezone TEXT,
  abbrev TEXT,
  utc_offset INTERVAL,
  is_dst BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    name AS timezone,
    abbrev,
    utc_offset,
    is_dst
  FROM pg_timezone_names
  WHERE name LIKE 'America/%'
    AND (
      name LIKE '%Toronto%'
      OR name LIKE '%Vancouver%'
      OR name LIKE '%Edmonton%'
      OR name LIKE '%Winnipeg%'
      OR name LIKE '%Halifax%'
      OR name LIKE '%St_Johns%'
      OR name = 'America/Montreal'
      OR name = 'America/Regina'
    )
  ORDER BY utc_offset DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.set_user_timezone TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_local_time TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_canadian_timezones TO authenticated;

-- Add comments
COMMENT ON COLUMN public.profiles.timezone IS 'User timezone in IANA format (e.g., America/Toronto). Validated against pg_timezone_names.';
COMMENT ON FUNCTION public.set_user_timezone IS 'Validates and sets user timezone. Returns success status and error if invalid.';
COMMENT ON FUNCTION public.get_user_local_time IS 'Returns current timestamp in user timezone';
COMMENT ON FUNCTION public.get_canadian_timezones IS 'Lists common Canadian timezones with UTC offsets';

-- Update existing profiles to have default timezone based on location
-- This is optional but helpful for Canadian users
UPDATE public.profiles
SET timezone = 'America/Toronto'
WHERE timezone IS NULL
  AND (postal_code IS NULL OR postal_code LIKE 'M%' OR postal_code LIKE 'L%' OR postal_code LIKE 'K%');

UPDATE public.profiles
SET timezone = 'America/Vancouver'
WHERE timezone IS NULL
  AND postal_code LIKE 'V%';

UPDATE public.profiles
SET timezone = 'America/Edmonton'
WHERE timezone IS NULL
  AND postal_code LIKE 'T%';

UPDATE public.profiles
SET timezone = 'America/Winnipeg'
WHERE timezone IS NULL
  AND (postal_code LIKE 'R%' OR postal_code LIKE 'S%');

UPDATE public.profiles
SET timezone = 'America/Halifax'
WHERE timezone IS NULL
  AND postal_code LIKE 'B%';

UPDATE public.profiles
SET timezone = 'America/St_Johns'
WHERE timezone IS NULL
  AND postal_code LIKE 'A%';
