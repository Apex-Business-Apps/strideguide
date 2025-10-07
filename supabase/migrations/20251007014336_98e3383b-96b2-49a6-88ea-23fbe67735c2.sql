-- Drop existing security definer views
DROP VIEW IF EXISTS public.public_features CASCADE;
DROP VIEW IF EXISTS public.public_pricing CASCADE;

-- Recreate public_features view WITHOUT security definer
CREATE VIEW public.public_features AS
SELECT 
  name,
  description,
  is_enabled
FROM public.feature_flags
WHERE is_enabled = true;

-- Recreate public_pricing view WITHOUT security definer
CREATE VIEW public.public_pricing AS
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

-- Grant public read access to these views
GRANT SELECT ON public.public_features TO anon, authenticated;
GRANT SELECT ON public.public_pricing TO anon, authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW public.public_features IS 'Public view of enabled features - no SECURITY DEFINER to avoid privilege escalation';
COMMENT ON VIEW public.public_pricing IS 'Public view of active pricing plans - no SECURITY DEFINER to avoid privilege escalation';