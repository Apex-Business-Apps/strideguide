-- Add explicit DENY policies to prevent audit log tampering and other security hardening

-- Prevent users from tampering with security audit logs
DROP POLICY IF EXISTS "Users cannot update audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Users cannot delete audit logs" ON public.security_audit_log;

CREATE POLICY "Users cannot update audit logs" 
ON public.security_audit_log FOR UPDATE 
USING (false);

CREATE POLICY "Users cannot delete audit logs" 
ON public.security_audit_log FOR DELETE 
USING (false);

-- Prevent users from deleting their billing events
DROP POLICY IF EXISTS "Users cannot delete billing_events" ON public.billing_events;
CREATE POLICY "Users cannot delete billing_events" 
ON public.billing_events FOR DELETE 
USING (false);

-- Prevent users from manually updating billing events
DROP POLICY IF EXISTS "Users cannot update billing_events" ON public.billing_events;
CREATE POLICY "Users cannot update billing_events" 
ON public.billing_events FOR UPDATE 
USING (false);

-- Prevent manual insertion of billing events (only via webhooks)
DROP POLICY IF EXISTS "Users cannot insert billing_events" ON public.billing_events;
CREATE POLICY "Users cannot insert billing_events" 
ON public.billing_events FOR INSERT 
WITH CHECK (false);