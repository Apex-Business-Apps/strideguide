-- Fix the search path security warning by recreating the function properly
-- First drop all triggers that depend on the function
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_emergency_contacts_updated_at ON public.emergency_contacts;
DROP TRIGGER IF EXISTS update_learned_items_updated_at ON public.learned_items;
DROP TRIGGER IF EXISTS update_emergency_recordings_updated_at ON public.emergency_recordings;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;

-- Now drop and recreate the function with proper security
DROP FUNCTION IF EXISTS public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate all the triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_emergency_contacts_updated_at
  BEFORE UPDATE ON public.emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_learned_items_updated_at
  BEFORE UPDATE ON public.learned_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_emergency_recordings_updated_at
  BEFORE UPDATE ON public.emergency_recordings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();