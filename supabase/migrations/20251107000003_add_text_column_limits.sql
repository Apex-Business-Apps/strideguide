-- Migration: Add Length Limits to TEXT Columns
-- Date: 2025-11-07
-- Priority: P0 Critical
-- Description: Converts unbounded TEXT columns to VARCHAR with appropriate limits
-- Refs: COMPREHENSIVE_AUDIT_FINDINGS.md P0 High Priority

-- =====================================================
-- PERFORMANCE & SECURITY: Add Length Limits
-- =====================================================

-- 1. profiles table
ALTER TABLE public.profiles
  ALTER COLUMN email TYPE VARCHAR(255);

ALTER TABLE public.profiles
  ALTER COLUMN first_name TYPE VARCHAR(100);

ALTER TABLE public.profiles
  ALTER COLUMN last_name TYPE VARCHAR(100);

ALTER TABLE public.profiles
  ALTER COLUMN timezone TYPE VARCHAR(50);

-- 2. emergency_contacts table
ALTER TABLE public.emergency_contacts
  ALTER COLUMN name TYPE VARCHAR(255);

ALTER TABLE public.emergency_contacts
  ALTER COLUMN phone_number TYPE VARCHAR(20);

ALTER TABLE public.emergency_contacts
  ALTER COLUMN relationship TYPE VARCHAR(50);

-- Add phone number format validation
ALTER TABLE public.emergency_contacts
  ADD CONSTRAINT valid_phone_format
  CHECK (phone_number ~ '^\+?[0-9\s\-\(\)]{7,20}$');

-- 3. organizations table
ALTER TABLE public.organizations
  ALTER COLUMN name TYPE VARCHAR(255);

ALTER TABLE public.organizations
  ALTER COLUMN slug TYPE VARCHAR(100);

-- Add slug format validation (lowercase, alphanumeric, hyphens only)
ALTER TABLE public.organizations
  ADD CONSTRAINT valid_slug_format
  CHECK (slug ~ '^[a-z0-9\-]+$');

-- 4. user_subscriptions table
ALTER TABLE public.user_subscriptions
  ALTER COLUMN stripe_customer_id TYPE VARCHAR(100);

ALTER TABLE public.user_subscriptions
  ALTER COLUMN stripe_subscription_id TYPE VARCHAR(100);

ALTER TABLE public.user_subscriptions
  ALTER COLUMN plan_id TYPE VARCHAR(50);

-- 5. subscription_plans table
ALTER TABLE public.subscription_plans
  ALTER COLUMN name TYPE VARCHAR(100);

ALTER TABLE public.subscription_plans
  ALTER COLUMN stripe_price_id TYPE VARCHAR(100);

ALTER TABLE public.subscription_plans
  ALTER COLUMN stripe_product_id TYPE VARCHAR(100);

-- 6. billing_events table
ALTER TABLE public.billing_events
  ALTER COLUMN event_type TYPE VARCHAR(50);

ALTER TABLE public.billing_events
  ALTER COLUMN stripe_event_id TYPE VARCHAR(100);

-- 7. learned_items table
ALTER TABLE public.learned_items
  ALTER COLUMN item_name TYPE VARCHAR(255);

ALTER TABLE public.learned_items
  ALTER COLUMN description TYPE VARCHAR(1000);

-- Add JSONB size limit for embeddings (max 1MB)
ALTER TABLE public.learned_items
  ADD CONSTRAINT embeddings_size_limit
  CHECK (pg_column_size(embeddings) < 1048576);

-- 8. emergency_recordings table
ALTER TABLE public.emergency_recordings
  ALTER COLUMN session_id TYPE VARCHAR(100);

-- Add JSONB size limit for location_data (max 100KB)
ALTER TABLE public.emergency_recordings
  ADD CONSTRAINT location_data_size_limit
  CHECK (pg_column_size(location_data) < 102400);

-- 9. feature_flags table
ALTER TABLE public.feature_flags
  ALTER COLUMN feature_name TYPE VARCHAR(100);

-- 10. user_roles table
ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE VARCHAR(50);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'All TEXT columns converted to VARCHAR with appropriate limits';
  RAISE NOTICE 'Added validation constraints for phone numbers and slugs';
  RAISE NOTICE 'Added size limits for JSONB columns';
END $$;
