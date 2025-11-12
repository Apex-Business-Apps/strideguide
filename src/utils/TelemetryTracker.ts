import { supabase } from '@/lib/supabaseClient';

/**
 * Lightweight telemetry tracker for production observability
 * NO external vendors - all data stays in Supabase
 * Emits to both journey_traces (detailed) and app_metrics (fast p95/error queries)
 */

interface JourneyTrace {
  journey: 'start_guidance' | 'find_item' | 'settings_save';
  status: 'started' | 'completed' | 'failed';
  duration_ms?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface PerformanceMetric {
  operation: string;
  value_ms: number;
  percentile?: string;
}

class TelemetryTracker {
  private journeyStartTimes: Map<string, number> = new Map();
  private performanceBuffer: PerformanceMetric[] = [];
  private flushInterval: number = 30000; // 30s
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Auto-flush buffered metrics
    if (typeof window !== 'undefined') {
      this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
      
      // Flush on page unload
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  /**
   * Start tracking a user journey
   */
  startJourney(journey: JourneyTrace['journey'], metadata?: Record<string, unknown>) {
    const key = `${journey}-${Date.now()}`;
    this.journeyStartTimes.set(key, performance.now());

    // Log start event (no await - fire and forget)
    this.logJourney({
      journey,
      status: 'started',
      metadata,
    });

    return key;
  }

  /**
   * Complete a user journey successfully
   */
  completeJourney(journeyKey: string, journey: JourneyTrace['journey'], metadata?: Record<string, unknown>) {
    const startTime = this.journeyStartTimes.get(journeyKey);
    if (!startTime) return;

    const duration_ms = Math.round(performance.now() - startTime);
    this.journeyStartTimes.delete(journeyKey);

    this.logJourney({
      journey,
      status: 'completed',
      duration_ms,
      metadata,
    });

    // Also emit to app_metrics for fast p95 queries
    this.emitMetric(journey, duration_ms, true, metadata);
  }

  /**
   * Mark a journey as failed
   */
  failJourney(journeyKey: string, journey: JourneyTrace['journey'], error: string, metadata?: Record<string, unknown>) {
    const startTime = this.journeyStartTimes.get(journeyKey);
    const duration_ms = startTime ? Math.round(performance.now() - startTime) : undefined;
    this.journeyStartTimes.delete(journeyKey);

    this.logJourney({
      journey,
      status: 'failed',
      duration_ms,
      error,
      metadata,
    });

    // Also emit to app_metrics (ok=false for error rate)
    this.emitMetric(journey, duration_ms, false, { ...metadata, error });
  }

  /**
   * Track a performance metric
   */
  trackPerformance(operation: string, value_ms: number, percentile?: string) {
    this.performanceBuffer.push({
      operation,
      value_ms,
      percentile,
    });

    // Auto-flush if buffer gets large
    if (this.performanceBuffer.length >= 50) {
      this.flush();
    }
  }

  /**
   * Track Core Web Vitals
   */
  trackWebVital(metric: { name: string; value: number; rating?: string }) {
    this.trackPerformance(
      `web_vital_${metric.name.toLowerCase()}`,
      metric.value,
      metric.rating
    );
  }

  /**
   * Flush buffered metrics to database
   */
  private async flush() {
    if (this.performanceBuffer.length === 0) return;

    const metrics = this.performanceBuffer.splice(0);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      await supabase.from('performance_metrics').insert(
        metrics.map(m => ({
          metric_name: m.operation,
          value: m.value_ms,
          percentile: m.percentile,
          user_id: user?.id,
        }))
      );
    } catch (error) {
      // Silent fail - telemetry should never break app
      if (import.meta.env.DEV) {
        console.error('Telemetry flush failed:', error);
      }
    }
  }

  /**
   * Log journey event to journey_traces (detailed tracking)
   */
  private async logJourney(trace: JourneyTrace) {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return; // Anonymous users not tracked

      await supabase.from('journey_traces').insert({
        journey_name: trace.journey,
        status: trace.status,
        duration_ms: trace.duration_ms,
        error_message: trace.error,
        metadata: trace.metadata || {},
      });
    } catch (error) {
      // Silent fail
      if (import.meta.env.DEV) {
        console.error('Journey trace failed:', error);
      }
    }
  }

  /**
   * Emit to app_metrics table (fast p95/error queries)
   */
  private async emitMetric(
    event: string, 
    duration_ms: number | undefined, 
    ok: boolean, 
    metadata?: Record<string, unknown>
  ) {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      await supabase.from('app_metrics').insert({
        event,
        duration_ms,
        ok,
        metadata: metadata || {},
      });
    } catch (error) {
      // Silent fail
      if (import.meta.env.DEV) {
        console.error('App metric emit failed:', error);
      }
    }
  }

  /**
   * Cleanup on app shutdown
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Singleton instance
export const telemetryTracker = new TelemetryTracker();
