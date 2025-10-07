-- Final RLS hardening: Add explicit SELECT policies and prevent data tampering

-- Profiles: block anonymous completely
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Block anonymous profiles') THEN
    CREATE POLICY "Block anonymous profiles" ON public.profiles FOR ALL TO anon USING (false);
  END IF;
END $$;

-- Journey traces: prevent modification and add SELECT policy
CREATE POLICY "Users can view own traces" ON public.journey_traces FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Block trace updates" ON public.journey_traces FOR UPDATE USING (false);
CREATE POLICY "Block trace deletes" ON public.journey_traces FOR DELETE USING (false);

-- Performance metrics: prevent modification
CREATE POLICY "Block metric updates" ON public.performance_metrics FOR UPDATE USING (false);
CREATE POLICY "Block metric deletes" ON public.performance_metrics FOR DELETE USING (false);