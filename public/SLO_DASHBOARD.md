# StrideGuide SLO Dashboard

## Service Level Objectives (SLOs)

### Critical User Journeys

#### 1. Start Guidance Journey
- **Target Success Rate**: 95%
- **Target p95 Latency**: < 2000ms
- **Error Budget**: 5% (72 minutes/day)

**Current Status Query**:
```sql
SELECT 
  COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*) as success_rate_pct,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_latency_ms,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failures,
  COUNT(*) as total_attempts
FROM journey_traces
WHERE journey_name = 'start_guidance'
  AND created_at > now() - interval '24 hours';
```

#### 2. Find Item Journey
- **Target Success Rate**: 90%
- **Target p95 Latency**: < 1500ms
- **Error Budget**: 10% (144 minutes/day)

**Current Status Query**:
```sql
SELECT 
  COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*) as success_rate_pct,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_latency_ms,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failures,
  COUNT(*) as total_attempts
FROM journey_traces
WHERE journey_name = 'find_item'
  AND created_at > now() - interval '24 hours';
```

#### 3. Settings Save Journey
- **Target Success Rate**: 99%
- **Target p95 Latency**: < 500ms
- **Error Budget**: 1% (14 minutes/day)

**Current Status Query**:
```sql
SELECT 
  COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*) as success_rate_pct,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_latency_ms,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failures,
  COUNT(*) as total_attempts
FROM journey_traces
WHERE journey_name = 'settings_save'
  AND created_at > now() - interval '24 hours';
```

### Payment Processing

#### Checkout Success Rate
- **Target**: 95%
- **Error Budget**: 5%

**Current Status Query**:
```sql
SELECT 
  COUNT(CASE WHEN event_type = 'checkout_created' THEN 1 END) as checkout_attempts,
  COUNT(CASE WHEN event_type = 'subscription_updated' THEN 1 END) as successful_subscriptions,
  COUNT(CASE WHEN event_type = 'subscription_updated' THEN 1 END) * 100.0 / 
    NULLIF(COUNT(CASE WHEN event_type = 'checkout_created' THEN 1 END), 0) as success_rate_pct
FROM security_audit_log
WHERE created_at > now() - interval '24 hours';
```

#### Webhook Processing
- **Target Success Rate**: 99.9%
- **Target Latency**: < 1000ms

**Current Status Query**:
```sql
SELECT 
  COUNT(CASE WHEN severity = 'info' AND event_type LIKE '%subscription%' THEN 1 END) as successful_webhooks,
  COUNT(CASE WHEN severity = 'critical' AND event_type LIKE 'webhook_%' THEN 1 END) as failed_webhooks,
  COUNT(CASE WHEN severity = 'critical' AND event_type LIKE 'webhook_%' THEN 1 END) * 100.0 /
    NULLIF(COUNT(*), 0) as failure_rate_pct
FROM security_audit_log
WHERE event_type LIKE '%webhook%' OR event_type LIKE '%subscription%'
  AND created_at > now() - interval '24 hours';
```

### Performance Budgets

#### Core Web Vitals
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

**Current Status Query**:
```sql
SELECT 
  metric_name,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) as p75_value,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95_value,
  COUNT(*) as sample_size
FROM performance_metrics
WHERE metric_name LIKE 'web_vital_%'
  AND created_at > now() - interval '24 hours'
GROUP BY metric_name;
```

#### API Response Times
- **p95 Edge Functions**: < 1000ms
- **p95 Database Queries**: < 200ms

### Security Metrics

#### Critical Security Events
- **Target**: 0 per day
- **Alert Threshold**: Any critical event triggers immediate investigation

**Current Status Query**:
```sql
SELECT 
  event_type,
  COUNT(*) as count,
  MAX(created_at) as last_occurrence
FROM security_audit_log
WHERE severity = 'critical'
  AND created_at > now() - interval '24 hours'
GROUP BY event_type
ORDER BY count DESC;
```

#### Rate Limit Violations
- **Target**: < 10 per day
- **Alert Threshold**: > 50 per hour

**Current Status Query**:
```sql
SELECT 
  COUNT(*) as rate_limit_violations,
  COUNT(DISTINCT user_id) as affected_users
FROM security_audit_log
WHERE event_type = 'rate_limit_exceeded'
  AND created_at > now() - interval '24 hours';
```

## Error Budget Policy

### Error Budget Calculation
```
Error Budget = (100% - SLO) × Time Period
Example: 95% SLO → 5% error budget → 72 minutes/day
```

### Error Budget Status
```sql
WITH error_budget AS (
  SELECT 
    journey_name,
    CASE 
      WHEN journey_name = 'start_guidance' THEN 95.0
      WHEN journey_name = 'find_item' THEN 90.0
      WHEN journey_name = 'settings_save' THEN 99.0
    END as slo_target,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*) as actual_success_rate,
    COUNT(*) as total_requests
  FROM journey_traces
  WHERE created_at > now() - interval '24 hours'
  GROUP BY journey_name
)
SELECT 
  journey_name,
  slo_target,
  actual_success_rate,
  (100 - slo_target) as error_budget_pct,
  (100 - actual_success_rate) as errors_consumed_pct,
  CASE 
    WHEN (100 - actual_success_rate) > (100 - slo_target) THEN 'BREACHED ⚠️'
    WHEN (100 - actual_success_rate) > (100 - slo_target) * 0.8 THEN 'WARNING 🟡'
    ELSE 'HEALTHY ✅'
  END as budget_status,
  total_requests as sample_size
FROM error_budget
ORDER BY journey_name;
```

### Actions When Error Budget Exhausted

#### 🔴 BREACHED (Budget exhausted)
1. **Immediate**: Stop new feature rollouts
2. **Within 1 hour**: Root cause analysis meeting
3. **Within 24 hours**: Implement fix or rollback
4. **Required**: Postmortem document

#### 🟡 WARNING (80%+ budget consumed)
1. **Immediate**: Alert on-call engineer
2. **Within 4 hours**: Investigate anomalies
3. **Required**: Increase monitoring frequency

#### ✅ HEALTHY (Budget intact)
1. **Continue**: Normal development pace
2. **Required**: Weekly SLO review

## Monitoring Automation

### Hourly Health Check (Cron Job)
```sql
-- Save as Supabase scheduled query
SELECT 
  'StrideGuide Health Check' as report_name,
  now() as generated_at,
  (SELECT COUNT(*) FROM journey_traces WHERE status = 'failed' AND created_at > now() - interval '1 hour') as hourly_failures,
  (SELECT COUNT(*) FROM security_audit_log WHERE severity = 'critical' AND created_at > now() - interval '1 hour') as critical_events,
  (SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) FROM performance_metrics WHERE metric_name = 'web_vital_lcp' AND created_at > now() - interval '1 hour') as lcp_p95;
```

### Daily SLO Report
```sql
SELECT 
  current_date as report_date,
  journey_name,
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
  ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate_pct,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) as p95_latency_ms
FROM journey_traces
WHERE created_at >= current_date AND created_at < current_date + interval '1 day'
GROUP BY journey_name
ORDER BY journey_name;
```

## Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Journey failure rate | > 5% | > 10% |
| p95 latency | > 500ms | > 1000ms |
| Webhook failures | > 1/hour | > 5/hour |
| Security critical events | > 0 | > 1 |
| LCP | > 2.5s | > 4s |
| Error budget consumed | > 80% | > 100% |

---

**Last Updated**: 2025-01-05  
**Review Frequency**: Weekly  
**Owner**: StrideGuide Reliability Team
