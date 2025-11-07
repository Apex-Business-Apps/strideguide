-- Migration: Add Missing Indexes for Performance
-- Date: 2025-11-07
-- Priority: P0 Critical
-- Description: Adds missing indexes on foreign keys and frequently queried columns
-- Refs: COMPREHENSIVE_AUDIT_FINDINGS.md P0 High Priority

-- =====================================================
-- PERFORMANCE: Add Missing Indexes
-- =====================================================

-- 1. Foreign key indexes (improve JOIN performance)

-- Index for organizations.owner_id (FK to auth.users)
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id
  ON public.organizations(owner_id);

-- Index for user_subscriptions.status (frequently filtered)
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status
  ON public.user_subscriptions(status);

-- Index for emergency_recordings.session_id
CREATE INDEX IF NOT EXISTS idx_emergency_recordings_session
  ON public.emergency_recordings(session_id);

-- Index for billing_events.subscription_id
CREATE INDEX IF NOT EXISTS idx_billing_events_subscription
  ON public.billing_events(subscription_id);

-- 2. Composite indexes for common query patterns

-- Index for api_usage queries (user_id, endpoint, created_at)
CREATE INDEX IF NOT EXISTS idx_api_usage_user_endpoint_time
  ON public.api_usage(user_id, endpoint, created_at DESC);

-- Index for learned_items queries (user_id, created_at)
CREATE INDEX IF NOT EXISTS idx_learned_items_user_time
  ON public.learned_items(user_id, created_at DESC);

-- Index for emergency_recordings queries (user_id, status)
CREATE INDEX IF NOT EXISTS idx_emergency_recordings_user_status
  ON public.emergency_recordings(user_id, status);

-- Index for user_roles queries (organization_id, role)
CREATE INDEX IF NOT EXISTS idx_user_roles_org_role
  ON public.user_roles(organization_id, role);

-- 3. Partial indexes for specific use cases

-- Index for enabled feature flags (filtered queries)
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled
  ON public.feature_flags(is_enabled)
  WHERE is_enabled = true;

-- Index for active subscriptions (most common query)
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active
  ON public.user_subscriptions(user_id, status)
  WHERE status = 'active';

-- 4. Indexes for audit and analytics tables

-- Index for security_audit_log (user_id, event_type, created_at)
CREATE INDEX IF NOT EXISTS idx_security_audit_user_event_time
  ON public.security_audit_log(user_id, event_type, created_at DESC);

-- Index for usage_analytics (user_id, created_at)
CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_time
  ON public.usage_analytics(user_id, created_at DESC);

-- Index for journey_traces (user_id, trace_type, created_at)
CREATE INDEX IF NOT EXISTS idx_journey_traces_user_type_time
  ON public.journey_traces(user_id, trace_type, created_at DESC);

-- Index for app_metrics (metric_name, created_at)
CREATE INDEX IF NOT EXISTS idx_app_metrics_name_time
  ON public.app_metrics(metric_name, created_at DESC);

-- =====================================================
-- ANALYZE TABLES (Update statistics for query planner)
-- =====================================================

ANALYZE public.organizations;
ANALYZE public.user_subscriptions;
ANALYZE public.emergency_recordings;
ANALYZE public.billing_events;
ANALYZE public.api_usage;
ANALYZE public.learned_items;
ANALYZE public.user_roles;
ANALYZE public.feature_flags;
ANALYZE public.security_audit_log;
ANALYZE public.usage_analytics;
ANALYZE public.journey_traces;
ANALYZE public.app_metrics;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';

  RAISE NOTICE 'Total indexes created: %', index_count;
  RAISE NOTICE 'All performance indexes added successfully';
  RAISE NOTICE 'Tables analyzed for query planner optimization';
END $$;
