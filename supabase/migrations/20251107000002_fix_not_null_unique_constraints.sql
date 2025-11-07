-- Migration: Fix NOT NULL and UNIQUE Constraints
-- Date: 2025-11-07
-- Priority: P0 Critical
-- Description: Adds missing NOT NULL and UNIQUE constraints for data integrity
-- Refs: COMPREHENSIVE_AUDIT_FINDINGS.md P0-9

-- =====================================================
-- CRITICAL FIX: Add NOT NULL Constraints
-- =====================================================

-- 1. Add NOT NULL constraint on profiles.email
-- Ensures all user profiles have an email address (required for auth)
-- First, update any NULL emails to a placeholder (should not exist in practice)
UPDATE public.profiles
SET email = 'placeholder-' || id::text || '@strideguide.invalid'
WHERE email IS NULL;

-- Now add the NOT NULL constraint
ALTER TABLE public.profiles
  ALTER COLUMN email SET NOT NULL;

-- =====================================================
-- CRITICAL FIX: Add UNIQUE Constraints
-- =====================================================

-- 2. Add UNIQUE constraint on profiles.email
-- Prevents duplicate email registrations
-- First, handle any existing duplicates (keep first, update others)
WITH duplicates AS (
  SELECT id, email,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) AS rn
  FROM public.profiles
  WHERE email IS NOT NULL
)
UPDATE public.profiles p
SET email = p.email || '-duplicate-' || d.id::text
FROM duplicates d
WHERE p.id = d.id AND d.rn > 1;

-- Now add the UNIQUE constraint
ALTER TABLE public.profiles
  ADD CONSTRAINT unique_profiles_email
  UNIQUE (email);

-- 3. Add UNIQUE constraint on user_subscriptions.stripe_customer_id
-- Prevents duplicate Stripe customer IDs
ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT unique_stripe_customer_id
  UNIQUE (stripe_customer_id);

-- 4. Add UNIQUE constraint on user_subscriptions.stripe_subscription_id
-- Prevents duplicate Stripe subscription IDs
ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT unique_stripe_subscription_id
  UNIQUE (stripe_subscription_id);

-- 5. Add partial UNIQUE constraint for primary emergency contacts
-- Ensures each user has at most one primary emergency contact
CREATE UNIQUE INDEX unique_primary_emergency_contact
  ON public.emergency_contacts(user_id)
  WHERE is_primary = true;

-- =====================================================
-- VERIFICATION QUERIES (for testing)
-- =====================================================

DO $$
BEGIN
  -- Verify profiles.email is NOT NULL
  ASSERT (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email' AND is_nullable = 'NO') = 1,
    'profiles.email NOT NULL constraint not created';

  -- Verify UNIQUE constraints exist
  ASSERT (SELECT COUNT(*) FROM pg_constraint WHERE conname = 'unique_profiles_email') = 1,
    'UNIQUE constraint unique_profiles_email not created';
  ASSERT (SELECT COUNT(*) FROM pg_constraint WHERE conname = 'unique_stripe_customer_id') = 1,
    'UNIQUE constraint unique_stripe_customer_id not created';
  ASSERT (SELECT COUNT(*) FROM pg_constraint WHERE conname = 'unique_stripe_subscription_id') = 1,
    'UNIQUE constraint unique_stripe_subscription_id not created';
  ASSERT (SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'unique_primary_emergency_contact') = 1,
    'UNIQUE index unique_primary_emergency_contact not created';

  RAISE NOTICE 'All NOT NULL and UNIQUE constraints created successfully';
END $$;
