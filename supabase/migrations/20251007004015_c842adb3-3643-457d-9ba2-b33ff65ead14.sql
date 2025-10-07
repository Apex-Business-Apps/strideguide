-- ============================================================================
-- SECURITY HARDENING: Restrict Business Intelligence Exposure
-- ============================================================================
-- This migration addresses Medium-priority security findings:
-- 1. Feature flags table publicly readable (competitive intelligence risk)
-- 2. Subscription plans table publicly readable (pricing strategy exposure)
--
-- Solution: Require authentication for full table access, create public views
-- with sanitized data for public consumption
-- ============================================================================

-- ============================================================================
-- PART 1: FEATURE FLAGS - Restrict to Authenticated Users
-- ============================================================================

-- Drop existing public policy
DROP POLICY IF EXISTS "Feature flags are viewable by everyone" ON feature_flags;

-- Create new policy: Only authenticated users can view feature flags
CREATE POLICY "Authenticated users can view feature flags"
ON feature_flags 
FOR SELECT
TO authenticated
USING (is_enabled = true);

-- Create public view with limited data (no internal identifiers)
CREATE OR REPLACE VIEW public.public_features AS
SELECT 
  name,
  description,
  is_enabled
FROM feature_flags
WHERE is_enabled = true;

-- Grant access to public view (anonymous users can see this)
GRANT SELECT ON public.public_features TO anon;
GRANT SELECT ON public.public_features TO authenticated;

-- ============================================================================
-- PART 2: SUBSCRIPTION PLANS - Restrict to Authenticated Users
-- ============================================================================

-- Drop existing public policy
DROP POLICY IF EXISTS "Subscription plans are viewable by everyone" ON subscription_plans;

-- Create new policy: Only authenticated users can view full subscription plans
CREATE POLICY "Authenticated users can view subscription plans"
ON subscription_plans 
FOR SELECT
TO authenticated
USING (is_active = true);

-- Create public pricing view with sanitized data
-- Excludes: stripe_price_id, stripe_yearly_price_id, max_api_calls, internal configs
CREATE OR REPLACE VIEW public.public_pricing AS
SELECT 
  name,
  price_monthly,
  price_yearly,
  features,
  max_users,
  priority_support,
  white_label,
  is_active
FROM subscription_plans
WHERE is_active = true
ORDER BY price_monthly ASC;

-- Grant access to public pricing view
GRANT SELECT ON public.public_pricing TO anon;
GRANT SELECT ON public.public_pricing TO authenticated;

-- ============================================================================
-- AUDIT LOG: Record security policy changes
-- ============================================================================

INSERT INTO security_audit_log (
  user_id,
  event_type,
  severity,
  event_data
) VALUES (
  NULL, -- System-initiated change
  'security_policy_update',
  'info',
  jsonb_build_object(
    'action', 'restrict_business_intelligence_exposure',
    'tables_affected', ARRAY['feature_flags', 'subscription_plans'],
    'changes', 'Restricted public access, created sanitized public views',
    'migration_date', NOW()
  )
);