-- Spend Alerting System
-- Monitors API costs and sends alerts when thresholds are exceeded

-- Create spend_alerts table to track alert configurations
CREATE TABLE IF NOT EXISTS public.spend_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('daily', 'monthly', 'total')),
  threshold_amount DECIMAL(10,2) NOT NULL CHECK (threshold_amount > 0),
  current_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  alert_percentage INTEGER NOT NULL DEFAULT 80 CHECK (alert_percentage > 0 AND alert_percentage <= 100),
  last_alert_sent_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, alert_type)
);

-- Create spend_alert_notifications table to track sent alerts
CREATE TABLE IF NOT EXISTS public.spend_alert_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES public.spend_alerts(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  threshold_amount DECIMAL(10,2) NOT NULL,
  current_amount DECIMAL(10,2) NOT NULL,
  percentage_used DECIMAL(5,2) NOT NULL,
  message TEXT NOT NULL,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create cost_tracking table to track API costs
CREATE TABLE IF NOT EXISTS public.cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('openai', 'stripe', 'supabase', 'other')),
  operation TEXT NOT NULL,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,6) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_spend_alerts_user_active
  ON public.spend_alerts(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_spend_alert_notifications_user_created
  ON public.spend_alert_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cost_tracking_user_created
  ON public.cost_tracking(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cost_tracking_service
  ON public.cost_tracking(service, created_at DESC);

-- Enable RLS
ALTER TABLE public.spend_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spend_alert_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own spend alerts"
  ON public.spend_alerts
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own alert notifications"
  ON public.spend_alert_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view their own cost tracking"
  ON public.cost_tracking
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role can insert cost tracking and notifications
CREATE POLICY "Service role can insert cost tracking"
  ON public.cost_tracking
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can insert notifications"
  ON public.spend_alert_notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Function to track cost and check alerts
CREATE OR REPLACE FUNCTION public.track_cost_and_check_alerts(
  _user_id UUID,
  _service TEXT,
  _operation TEXT,
  _tokens_used INTEGER,
  _cost_usd DECIMAL,
  _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _daily_total DECIMAL;
  _monthly_total DECIMAL;
  _alert RECORD;
  _percentage_used DECIMAL;
  _alerts_triggered JSONB := '[]'::jsonb;
BEGIN
  -- Insert cost record
  INSERT INTO public.cost_tracking (
    user_id,
    service,
    operation,
    tokens_used,
    cost_usd,
    metadata
  ) VALUES (
    _user_id,
    _service,
    _operation,
    _tokens_used,
    _cost_usd,
    _metadata
  );

  -- Calculate daily total
  SELECT COALESCE(SUM(cost_usd), 0) INTO _daily_total
  FROM public.cost_tracking
  WHERE user_id = _user_id
    AND created_at >= CURRENT_DATE;

  -- Calculate monthly total
  SELECT COALESCE(SUM(cost_usd), 0) INTO _monthly_total
  FROM public.cost_tracking
  WHERE user_id = _user_id
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE);

  -- Check each active alert
  FOR _alert IN
    SELECT * FROM public.spend_alerts
    WHERE user_id = _user_id
      AND is_active = true
  LOOP
    -- Determine current amount based on alert type
    CASE _alert.alert_type
      WHEN 'daily' THEN
        _alert.current_amount := _daily_total;
      WHEN 'monthly' THEN
        _alert.current_amount := _monthly_total;
      WHEN 'total' THEN
        SELECT COALESCE(SUM(cost_usd), 0) INTO _alert.current_amount
        FROM public.cost_tracking
        WHERE user_id = _user_id;
    END CASE;

    -- Calculate percentage
    _percentage_used := (_alert.current_amount / _alert.threshold_amount) * 100;

    -- Check if alert should be triggered
    IF _percentage_used >= _alert.alert_percentage THEN
      -- Check if alert was sent in last 24 hours (prevent spam)
      IF _alert.last_alert_sent_at IS NULL
        OR _alert.last_alert_sent_at < (NOW() - INTERVAL '24 hours') THEN

        -- Create notification
        INSERT INTO public.spend_alert_notifications (
          user_id,
          alert_id,
          alert_type,
          threshold_amount,
          current_amount,
          percentage_used,
          message,
          is_critical
        ) VALUES (
          _user_id,
          _alert.id,
          _alert.alert_type,
          _alert.threshold_amount,
          _alert.current_amount,
          _percentage_used,
          format(
            'Spend alert: %s spending has reached %.1f%% of your $%.2f threshold (current: $%.2f)',
            _alert.alert_type,
            _percentage_used,
            _alert.threshold_amount,
            _alert.current_amount
          ),
          _percentage_used >= 100
        );

        -- Update alert last sent time
        UPDATE public.spend_alerts
        SET
          last_alert_sent_at = NOW(),
          updated_at = NOW()
        WHERE id = _alert.id;

        -- Add to triggered alerts list
        _alerts_triggered := _alerts_triggered || jsonb_build_object(
          'type', _alert.alert_type,
          'threshold', _alert.threshold_amount,
          'current', _alert.current_amount,
          'percentage', _percentage_used,
          'is_critical', _percentage_used >= 100
        );
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'cost_tracked', _cost_usd,
    'daily_total', _daily_total,
    'monthly_total', _monthly_total,
    'alerts_triggered', _alerts_triggered
  );
END;
$$;

-- Function to get user spending summary
CREATE OR REPLACE FUNCTION public.get_spending_summary(
  _user_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _user_to_check UUID;
  _daily DECIMAL;
  _weekly DECIMAL;
  _monthly DECIMAL;
  _total DECIMAL;
  _by_service JSONB;
BEGIN
  _user_to_check := COALESCE(_user_id, auth.uid());

  IF _user_to_check IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- Daily
  SELECT COALESCE(SUM(cost_usd), 0) INTO _daily
  FROM public.cost_tracking
  WHERE user_id = _user_to_check
    AND created_at >= CURRENT_DATE;

  -- Weekly
  SELECT COALESCE(SUM(cost_usd), 0) INTO _weekly
  FROM public.cost_tracking
  WHERE user_id = _user_to_check
    AND created_at >= (CURRENT_DATE - INTERVAL '7 days');

  -- Monthly
  SELECT COALESCE(SUM(cost_usd), 0) INTO _monthly
  FROM public.cost_tracking
  WHERE user_id = _user_to_check
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE);

  -- Total
  SELECT COALESCE(SUM(cost_usd), 0) INTO _total
  FROM public.cost_tracking
  WHERE user_id = _user_to_check;

  -- By service (last 30 days)
  SELECT COALESCE(
    jsonb_object_agg(service, total),
    '{}'::jsonb
  ) INTO _by_service
  FROM (
    SELECT
      service,
      SUM(cost_usd) as total
    FROM public.cost_tracking
    WHERE user_id = _user_to_check
      AND created_at >= (CURRENT_DATE - INTERVAL '30 days')
    GROUP BY service
  ) t;

  RETURN jsonb_build_object(
    'daily', _daily,
    'weekly', _weekly,
    'monthly', _monthly,
    'total', _total,
    'by_service', _by_service
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.track_cost_and_check_alerts TO service_role;
GRANT EXECUTE ON FUNCTION public.get_spending_summary TO authenticated;

-- Add triggers
CREATE TRIGGER update_spend_alerts_updated_at
  BEFORE UPDATE ON public.spend_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.spend_alerts IS 'User-configurable spend alert thresholds';
COMMENT ON TABLE public.spend_alert_notifications IS 'History of triggered spend alerts';
COMMENT ON TABLE public.cost_tracking IS 'Tracks API costs per user and service';
COMMENT ON FUNCTION public.track_cost_and_check_alerts IS 'Records cost and checks if any alerts should be triggered';
COMMENT ON FUNCTION public.get_spending_summary IS 'Returns spending summary for a user';
