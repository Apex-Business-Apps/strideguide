-- Idempotency tracking for Stripe operations (IDEMPOTENT)
CREATE TABLE IF NOT EXISTS public.stripe_idempotency_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  operation_type text NOT NULL,
  stripe_object_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stripe_idempotency_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage idempotency log"
  ON stripe_idempotency_log FOR ALL
  USING (true);

-- Journey telemetry (IDEMPOTENT)
CREATE TABLE IF NOT EXISTS public.journey_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  journey_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  duration_ms integer,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE journey_traces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own journey traces"
  ON journey_traces FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_journey_traces_user_journey ON journey_traces(user_id, journey_name, created_at DESC);

-- Performance metrics (IDEMPOTENT)
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  value numeric NOT NULL,
  percentile text,
  user_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert performance metrics"
  ON performance_metrics FOR INSERT
  WITH CHECK (true);