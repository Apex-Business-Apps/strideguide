-- Drop conflicting policy and recreate with correct logic
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;

-- Create comprehensive anonymous blocking policies for all sensitive tables
-- Only create policies that don't already exist

DO $$ 
BEGIN
  -- Check and create policy for emergency_recordings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'emergency_recordings' AND policyname = 'Block anonymous emergency_recordings'
  ) THEN
    CREATE POLICY "Block anonymous emergency_recordings" 
    ON public.emergency_recordings FOR ALL 
    USING (auth.role() = 'authenticated');
  END IF;

  -- Check and create policy for user_settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Block anonymous user_settings'
  ) THEN
    CREATE POLICY "Block anonymous user_settings" 
    ON public.user_settings FOR ALL 
    USING (auth.role() = 'authenticated');
  END IF;

  -- Check and create policy for billing_events (likely already exists)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'billing_events' AND policyname = 'Block anonymous billing_events'
  ) THEN
    CREATE POLICY "Block anonymous billing_events" 
    ON public.billing_events FOR ALL 
    USING (auth.role() = 'authenticated');
  END IF;

  -- Check and create policy for user_subscriptions (likely already exists)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_subscriptions' AND policyname = 'Block anonymous user_subscriptions'
  ) THEN
    CREATE POLICY "Block anonymous user_subscriptions" 
    ON public.user_subscriptions FOR ALL 
    USING (auth.role() = 'authenticated');
  END IF;

  -- Check and create policy for security_audit_log
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'security_audit_log' AND policyname = 'Block anonymous security_audit_log'
  ) THEN
    CREATE POLICY "Block anonymous security_audit_log" 
    ON public.security_audit_log FOR ALL 
    USING (auth.role() = 'authenticated');
  END IF;

  -- Check and create policy for organizations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'Block anonymous organizations'
  ) THEN
    CREATE POLICY "Block anonymous organizations" 
    ON public.organizations FOR ALL 
    USING (auth.role() = 'authenticated');
  END IF;

  -- Check and create policy for user_roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Block anonymous user_roles'
  ) THEN
    CREATE POLICY "Block anonymous user_roles" 
    ON public.user_roles FOR ALL 
    USING (auth.role() = 'authenticated');
  END IF;
END $$;