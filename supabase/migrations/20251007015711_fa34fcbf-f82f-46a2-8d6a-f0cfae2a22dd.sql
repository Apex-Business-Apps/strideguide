
-- Completely drop and recreate views to ensure no SECURITY DEFINER property
DROP VIEW IF EXISTS public.public_features CASCADE;
DROP VIEW IF EXISTS public.public_pricing CASCADE;

-- Create public_features view explicitly WITHOUT any security definer
CREATE OR REPLACE VIEW public.public_features AS
SELECT 
  name,
  description,
  is_enabled
FROM public.feature_flags
WHERE is_enabled = true;

-- Create public_pricing view explicitly WITHOUT any security definer  
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
FROM public.subscription_plans
WHERE is_active = true;

-- Ensure RLS is disabled on views (views inherit from base tables)
ALTER VIEW public.public_features SET (security_barrier = false);
ALTER VIEW public.public_pricing SET (security_barrier = false);

-- Grant explicit public access
GRANT SELECT ON public.public_features TO anon, authenticated;
GRANT SELECT ON public.public_pricing TO anon, authenticated;

-- Document the security model
COMMENT ON VIEW public.public_features IS 'Public read-only view of enabled features. No SECURITY DEFINER - uses invoker permissions.';
COMMENT ON VIEW public.public_pricing IS 'Public read-only view of active pricing. No SECURITY DEFINER - uses invoker permissions.';
