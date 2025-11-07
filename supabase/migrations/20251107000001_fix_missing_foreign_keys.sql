-- Migration: Fix Missing Foreign Key Constraints
-- Date: 2025-11-07
-- Priority: P0 Critical
-- Description: Adds missing FK constraints for data integrity
-- Refs: COMPREHENSIVE_AUDIT_FINDINGS.md P0-8

-- =====================================================
-- CRITICAL FIX: Add Foreign Key Constraints
-- =====================================================

-- 1. Add FK constraint for organizations.owner_id
-- Ensures organization owners exist in auth.users
-- Cascade delete: if owner deleted, organization is deleted
ALTER TABLE public.organizations
  ADD CONSTRAINT fk_organizations_owner
  FOREIGN KEY (owner_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- 2. Add FK constraint for user_subscriptions.user_id
-- Ensures subscription users exist in auth.users
-- Cascade delete: if user deleted, subscription is deleted
ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT fk_user_subscriptions_user
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- 3. Add FK constraint for billing_events.user_id
-- Ensures billing event users exist in auth.users
-- Set NULL on delete: preserve billing history even if user deleted
ALTER TABLE public.billing_events
  ADD CONSTRAINT fk_billing_events_user
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- 4. Add FK constraint for billing_events.subscription_id
-- Ensures billing events reference valid subscriptions
-- Set NULL on delete: preserve billing history even if subscription deleted
ALTER TABLE public.billing_events
  ADD CONSTRAINT fk_billing_events_subscription
  FOREIGN KEY (subscription_id)
  REFERENCES public.user_subscriptions(id)
  ON DELETE SET NULL;

-- =====================================================
-- VERIFICATION QUERIES (for testing)
-- =====================================================

-- Verify all FK constraints were created
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM pg_constraint WHERE conname = 'fk_organizations_owner') = 1,
    'FK constraint fk_organizations_owner not created';
  ASSERT (SELECT COUNT(*) FROM pg_constraint WHERE conname = 'fk_user_subscriptions_user') = 1,
    'FK constraint fk_user_subscriptions_user not created';
  ASSERT (SELECT COUNT(*) FROM pg_constraint WHERE conname = 'fk_billing_events_user') = 1,
    'FK constraint fk_billing_events_user not created';
  ASSERT (SELECT COUNT(*) FROM pg_constraint WHERE conname = 'fk_billing_events_subscription') = 1,
    'FK constraint fk_billing_events_subscription not created';

  RAISE NOTICE 'All foreign key constraints created successfully';
END $$;
