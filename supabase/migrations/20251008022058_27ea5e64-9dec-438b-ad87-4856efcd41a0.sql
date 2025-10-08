-- Phase 1: Add performance indexes (standard method)
-- Note: CONCURRENTLY not supported in Supabase migrations
-- For true concurrent creation, use SQL Editor during maintenance window
-- These indexes improve admin checks and audit log queries

-- Index for admin role checks on user_roles table
-- Speeds up: SELECT FROM user_roles WHERE user_id = ? AND role IN ('admin', 'super-admin')
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role 
ON public.user_roles(user_id, role);

-- Index for audit log queries (user-specific + time-ordered)
-- Speeds up: SELECT FROM security_audit_log WHERE user_id = ? AND event_type = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_event_time 
ON public.security_audit_log(user_id, event_type, created_at DESC);

-- Add comments for future reference
COMMENT ON INDEX idx_user_roles_user_id_role IS 'Phase 1 migration: Optimizes admin role lookups';
COMMENT ON INDEX idx_security_audit_log_user_event_time IS 'Phase 1 migration: Optimizes audit log queries with time ordering';