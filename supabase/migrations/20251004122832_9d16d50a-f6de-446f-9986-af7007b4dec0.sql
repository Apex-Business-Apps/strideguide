-- Drop and recreate get_user_subscription with proper search_path
DROP FUNCTION IF EXISTS public.get_user_subscription(uuid);

CREATE OR REPLACE FUNCTION public.get_user_subscription(user_uuid uuid)
RETURNS TABLE (
  plan_name text,
  plan_features jsonb,
  max_api_calls integer,
  max_users integer,
  priority_support boolean,
  white_label boolean,
  status text,
  stripe_subscription_id text,
  current_period_end timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    sp.name as plan_name,
    sp.features as plan_features,
    sp.max_api_calls,
    sp.max_users,
    sp.priority_support,
    sp.white_label,
    us.status,
    us.stripe_subscription_id,
    us.current_period_end
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = user_uuid
  AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1;
$$;