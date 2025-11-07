-- Table Partitioning for Time-Series Data
-- Partitions high-volume tables by month for better query performance

-- NOTE: Partitioning is applied to new tables only
-- Existing data migration would require careful planning and downtime

-- Create partitioned audit_log table (future)
CREATE TABLE IF NOT EXISTS public.audit_log_partitioned (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  user_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create partitions for audit_log (current month + next 3 months)
CREATE TABLE IF NOT EXISTS public.audit_log_2025_11 PARTITION OF public.audit_log_partitioned
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE IF NOT EXISTS public.audit_log_2025_12 PARTITION OF public.audit_log_partitioned
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE IF NOT EXISTS public.audit_log_2026_01 PARTITION OF public.audit_log_partitioned
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE IF NOT EXISTS public.audit_log_2026_02 PARTITION OF public.audit_log_partitioned
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Create partitioned api_usage table (future)
CREATE TABLE IF NOT EXISTS public.api_usage_partitioned (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create partitions for api_usage
CREATE TABLE IF NOT EXISTS public.api_usage_2025_11 PARTITION OF public.api_usage_partitioned
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE IF NOT EXISTS public.api_usage_2025_12 PARTITION OF public.api_usage_partitioned
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE IF NOT EXISTS public.api_usage_2026_01 PARTITION OF public.api_usage_partitioned
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE IF NOT EXISTS public.api_usage_2026_02 PARTITION OF public.api_usage_partitioned
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Create partitioned cost_tracking table (future)
CREATE TABLE IF NOT EXISTS public.cost_tracking_partitioned (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service TEXT NOT NULL CHECK (service IN ('openai', 'stripe', 'supabase', 'other')),
  operation TEXT NOT NULL,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,6) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create partitions for cost_tracking
CREATE TABLE IF NOT EXISTS public.cost_tracking_2025_11 PARTITION OF public.cost_tracking_partitioned
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE IF NOT EXISTS public.cost_tracking_2025_12 PARTITION OF public.cost_tracking_partitioned
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE IF NOT EXISTS public.cost_tracking_2026_01 PARTITION OF public.cost_tracking_partitioned
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE IF NOT EXISTS public.cost_tracking_2026_02 PARTITION OF public.cost_tracking_partitioned
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Create indexes on partitioned tables
CREATE INDEX IF NOT EXISTS idx_audit_log_part_user_created
  ON public.audit_log_partitioned(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_part_table_created
  ON public.audit_log_partitioned(table_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_usage_part_user_created
  ON public.api_usage_partitioned(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_usage_part_endpoint_created
  ON public.api_usage_partitioned(endpoint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cost_tracking_part_user_created
  ON public.cost_tracking_partitioned(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cost_tracking_part_service_created
  ON public.cost_tracking_partitioned(service, created_at DESC);

-- Function to create next month's partitions automatically
CREATE OR REPLACE FUNCTION public.create_next_month_partitions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _next_month DATE;
  _month_after DATE;
  _table_suffix TEXT;
  _partition_name TEXT;
BEGIN
  -- Calculate next month and month after
  _next_month := DATE_TRUNC('month', NOW() + INTERVAL '1 month')::DATE;
  _month_after := DATE_TRUNC('month', NOW() + INTERVAL '2 months')::DATE;

  -- Format table suffix (e.g., 2026_03)
  _table_suffix := TO_CHAR(_next_month, 'YYYY_MM');

  -- Create audit_log partition if not exists
  _partition_name := 'audit_log_' || _table_suffix;
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.audit_log_partitioned FOR VALUES FROM (%L) TO (%L)',
    _partition_name,
    _next_month,
    _month_after
  );

  -- Create api_usage partition if not exists
  _partition_name := 'api_usage_' || _table_suffix;
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.api_usage_partitioned FOR VALUES FROM (%L) TO (%L)',
    _partition_name,
    _next_month,
    _month_after
  );

  -- Create cost_tracking partition if not exists
  _partition_name := 'cost_tracking_' || _table_suffix;
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.cost_tracking_partitioned FOR VALUES FROM (%L) TO (%L)',
    _partition_name,
    _next_month,
    _month_after
  );

  RAISE NOTICE 'Created partitions for %', _table_suffix;
END;
$$;

-- Function to drop old partitions (archive strategy)
CREATE OR REPLACE FUNCTION public.drop_old_partitions(_months_to_keep INTEGER DEFAULT 12)
RETURNS TABLE (
  table_name TEXT,
  dropped BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _cutoff_date DATE;
  _partition RECORD;
  _dropped BOOLEAN;
BEGIN
  _cutoff_date := DATE_TRUNC('month', NOW() - (_months_to_keep || ' months')::INTERVAL)::DATE;

  -- Find and drop old partitions
  FOR _partition IN
    SELECT
      schemaname,
      tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND (
        tablename LIKE 'audit_log_%'
        OR tablename LIKE 'api_usage_%'
        OR tablename LIKE 'cost_tracking_%'
      )
      AND tablename NOT LIKE '%_partitioned'
  LOOP
    -- Extract date from partition name (e.g., audit_log_2024_01 -> 2024-01-01)
    DECLARE
      _partition_date DATE;
      _year_month TEXT;
    BEGIN
      _year_month := REGEXP_REPLACE(_partition.tablename, '^[a-z_]+_(\d{4}_\d{2})$', '\1');
      _partition_date := TO_DATE(_year_month, 'YYYY_MM');

      IF _partition_date < _cutoff_date THEN
        EXECUTE format('DROP TABLE IF EXISTS public.%I', _partition.tablename);
        _dropped := true;

        table_name := _partition.tablename;
        dropped := true;
        reason := format('Partition older than %s months (cutoff: %s)', _months_to_keep, _cutoff_date);
        RETURN NEXT;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Skip partitions with invalid names
      CONTINUE;
    END;
  END LOOP;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_next_month_partitions TO service_role;
GRANT EXECUTE ON FUNCTION public.drop_old_partitions TO service_role;

-- Add comments
COMMENT ON TABLE public.audit_log_partitioned IS 'Partitioned audit log by month for better performance. Use this for new audit entries.';
COMMENT ON TABLE public.api_usage_partitioned IS 'Partitioned API usage by month for better performance. Use this for new usage tracking.';
COMMENT ON TABLE public.cost_tracking_partitioned IS 'Partitioned cost tracking by month for better performance. Use this for new cost entries.';

COMMENT ON FUNCTION public.create_next_month_partitions IS 'Creates partitions for the next month. Run this monthly via cron job.';
COMMENT ON FUNCTION public.drop_old_partitions IS 'Drops partitions older than X months (default 12). Use for archival/cleanup.';

-- Migration note for future reference
DO $$
BEGIN
  RAISE NOTICE '
  ========================================
  PARTITIONING MIGRATION NOTE
  ========================================
  New partitioned tables created:
  - audit_log_partitioned
  - api_usage_partitioned
  - cost_tracking_partitioned

  To migrate existing data:
  1. Create backup of existing tables
  2. Copy data to partitioned tables
  3. Rename old tables to _old
  4. Rename partitioned tables to remove _partitioned suffix
  5. Update application code to use new tables
  6. Test thoroughly
  7. Drop old tables after verification

  To maintain partitions:
  - Run create_next_month_partitions() monthly (suggest cron job)
  - Run drop_old_partitions(12) quarterly to cleanup old data

  Partitioning benefits:
  - Faster queries (only scan relevant months)
  - Easy archival (drop old partitions)
  - Better vacuum performance
  - Reduced index size per partition
  ========================================
  ';
END $$;
