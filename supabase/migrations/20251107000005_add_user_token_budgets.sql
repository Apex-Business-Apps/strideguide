-- Migration: Add Per-User Token Budgets
-- Date: 2025-11-07
-- Priority: P1 High
-- Description: Implements daily/monthly token limits per user for cost control
-- Refs: COMPREHENSIVE_AUDIT_FINDINGS.md P1 Cost Control

-- =====================================================
-- COST CONTROL: Add Token Budget Tracking
-- =====================================================

-- 1. Add budget columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_token_limit INTEGER DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS monthly_token_limit INTEGER DEFAULT 300000,
  ADD COLUMN IF NOT EXISTS daily_tokens_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_tokens_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_daily_reset TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_monthly_reset TIMESTAMPTZ DEFAULT now();

COMMENT ON COLUMN public.profiles.daily_token_limit IS 'Max tokens allowed per day (OpenAI API)';
COMMENT ON COLUMN public.profiles.monthly_token_limit IS 'Max tokens allowed per month (OpenAI API)';
COMMENT ON COLUMN public.profiles.daily_tokens_used IS 'Tokens used today';
COMMENT ON COLUMN public.profiles.monthly_tokens_used IS 'Tokens used this month';

-- 2. Function to check if user is within budget
CREATE OR REPLACE FUNCTION public.check_token_budget(
  user_uuid UUID,
  tokens_to_use INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_record RECORD;
  new_daily_total INTEGER;
  new_monthly_total INTEGER;
BEGIN
  -- Get current usage
  SELECT
    daily_token_limit,
    monthly_token_limit,
    daily_tokens_used,
    monthly_tokens_used,
    last_daily_reset,
    last_monthly_reset
  INTO profile_record
  FROM public.profiles
  WHERE id = user_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Reset daily counter if needed (after 24 hours)
  IF (now() - profile_record.last_daily_reset) > INTERVAL '24 hours' THEN
    UPDATE public.profiles
    SET daily_tokens_used = 0,
        last_daily_reset = now()
    WHERE id = user_uuid;
    profile_record.daily_tokens_used := 0;
  END IF;

  -- Reset monthly counter if needed (after 30 days)
  IF (now() - profile_record.last_monthly_reset) > INTERVAL '30 days' THEN
    UPDATE public.profiles
    SET monthly_tokens_used = 0,
        last_monthly_reset = now()
    WHERE id = user_uuid;
    profile_record.monthly_tokens_used := 0;
  END IF;

  -- Calculate new totals
  new_daily_total := profile_record.daily_tokens_used + tokens_to_use;
  new_monthly_total := profile_record.monthly_tokens_used + tokens_to_use;

  -- Check if within limits
  IF new_daily_total > profile_record.daily_token_limit THEN
    RETURN FALSE; -- Exceeded daily limit
  END IF;

  IF new_monthly_total > profile_record.monthly_token_limit THEN
    RETURN FALSE; -- Exceeded monthly limit
  END IF;

  RETURN TRUE; -- Within budget
END;
$$;

-- 3. Function to increment token usage
CREATE OR REPLACE FUNCTION public.increment_token_usage(
  user_uuid UUID,
  tokens_used INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check budget first
  IF NOT check_token_budget(user_uuid, tokens_used) THEN
    RETURN FALSE; -- Budget exceeded
  END IF;

  -- Increment counters
  UPDATE public.profiles
  SET
    daily_tokens_used = daily_tokens_used + tokens_used,
    monthly_tokens_used = monthly_tokens_used + tokens_used
  WHERE id = user_uuid;

  RETURN TRUE; -- Success
END;
$$;

-- 4. Function to get current usage status
CREATE OR REPLACE FUNCTION public.get_token_usage_status(user_uuid UUID)
RETURNS TABLE (
  daily_used INTEGER,
  daily_limit INTEGER,
  daily_remaining INTEGER,
  daily_percent NUMERIC,
  monthly_used INTEGER,
  monthly_limit INTEGER,
  monthly_remaining INTEGER,
  monthly_percent NUMERIC,
  daily_reset_in INTERVAL,
  monthly_reset_in INTERVAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.daily_tokens_used,
    p.daily_token_limit,
    (p.daily_token_limit - p.daily_tokens_used) AS daily_remaining,
    ROUND((p.daily_tokens_used::NUMERIC / NULLIF(p.daily_token_limit, 0)) * 100, 2) AS daily_percent,
    p.monthly_tokens_used,
    p.monthly_token_limit,
    (p.monthly_token_limit - p.monthly_tokens_used) AS monthly_remaining,
    ROUND((p.monthly_tokens_used::NUMERIC / NULLIF(p.monthly_token_limit, 0)) * 100, 2) AS monthly_percent,
    (p.last_daily_reset + INTERVAL '24 hours' - now()) AS daily_reset_in,
    (p.last_monthly_reset + INTERVAL '30 days' - now()) AS monthly_reset_in
  FROM public.profiles p
  WHERE p.id = user_uuid;
END;
$$;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_token_budget(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_token_usage(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_token_usage_status(UUID) TO authenticated;

-- 6. Create index for efficient resets
CREATE INDEX IF NOT EXISTS idx_profiles_token_resets
  ON public.profiles(last_daily_reset, last_monthly_reset);

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Token budget system installed successfully';
  RAISE NOTICE 'Default limits: 10,000 tokens/day, 300,000 tokens/month';
  RAISE NOTICE 'Use check_token_budget() before API calls';
  RAISE NOTICE 'Use increment_token_usage() after successful API calls';
  RAISE NOTICE 'Use get_token_usage_status() to display usage to users';
END $$;
