-- Fix Security Definer View issue by recreating views with SECURITY INVOKER
-- This ensures views enforce RLS policies of the querying user, not the view creator

-- Drop existing views
DROP VIEW IF EXISTS public.public_features CASCADE;
DROP VIEW IF EXISTS public.public_pricing CASCADE;

-- Recreate public_features view with SECURITY INVOKER
CREATE VIEW public.public_features
WITH (security_invoker = true)
AS
SELECT 
  name,
  description,
  is_enabled
FROM public.feature_flags
WHERE is_enabled = true;

-- Recreate public_pricing view with SECURITY INVOKER
CREATE VIEW public.public_pricing
WITH (security_invoker = true)
AS
SELECT 
  name,
  price_monthly,
  price_yearly,
  features,
  max_users,
  priority_support,
  white_label,
  is_active
FROM public.subscription_plans
WHERE is_active = true;

-- Enable RLS on the views (this will enforce RLS from underlying tables)
ALTER VIEW public.public_features SET (security_invoker = true);
ALTER VIEW public.public_pricing SET (security_invoker = true);

-- Add comment explaining the security model
COMMENT ON VIEW public.public_features IS 'Public view of enabled features - uses SECURITY INVOKER to enforce RLS of querying user';
COMMENT ON VIEW public.public_pricing IS 'Public view of active pricing plans - uses SECURITY INVOKER to enforce RLS of querying user';