-- Add unique constraint to user_roles table to support ON CONFLICT in assign_admin_role function
-- This prevents duplicate role assignments for the same user

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_role_unique UNIQUE (user_id, role);

-- Create index for better performance on role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role 
ON public.user_roles (user_id, role);