/**
 * PerformanceMonitor - Production-ready performance tracking
 * Tracks Core Web Vitals and custom metrics for StrideGuide
 */

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface WebVitalsThresholds {
  good: number;
  needsImprovement: number;
}

const THRESHOLDS: Record<string, WebVitalsThresholds> = {
  LCP: { good: 2500, needsImprovement: 4000 },
  FID: { good: 100, needsImprovement: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 },
  INP: { good: 200, needsImprovement: 500 },
};

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observer: PerformanceObserver | null = null;
  private readonly MAX_METRICS = 100;
  private readonly BATCH_SIZE = 10;
  private pendingMetrics: PerformanceMetric[] = [];
  
  constructor() {
    if (typeof window === 'undefined') return;
    
    this.initializeObserver();
    this.trackNavigationTiming();
    this.trackResourceTiming();
  }

  private initializeObserver() {
    if (!('PerformanceObserver' in window)) {
      console.warn('[PerformanceMonitor] PerformanceObserver not supported');
      return;
    }

    try {
      // Observe Web Vitals
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processEntry(entry);
        }
      });

      // Observe multiple entry types for comprehensive monitoring
      const entryTypes = ['largest-contentful-paint', 'first-input', 'layout-shift'];
      entryTypes.forEach(type => {
        try {
          this.observer?.observe({ type, buffered: true });
        } catch (_e) {
          // Type not supported in this browser
        }
      });
    } catch (error) {
      console.error('[PerformanceMonitor] Failed to initialize observer:', error);
    }
  }

  private processEntry(entry: PerformanceEntry) {
    let metric: PerformanceMetric | null = null;

    if (entry.entryType === 'largest-contentful-paint') {
      const lcpEntry = entry as PerformanceEntry & { renderTime: number; loadTime: number };
      const value = lcpEntry.renderTime || lcpEntry.loadTime;
      metric = this.createMetric('LCP', value);
    } else if (entry.entryType === 'first-input') {
      const fidEntry = entry as PerformanceEntry & { processingStart: number };
      const value = fidEntry.processingStart - entry.startTime;
      metric = this.createMetric('FID', value);
    } else if (entry.entryType === 'layout-shift') {
      const clsEntry = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
      if (!clsEntry.hadRecentInput) {
        // Accumulate CLS
        const existingCLS = this.metrics.find(m => m.name === 'CLS');
        const value = (existingCLS?.value || 0) + clsEntry.value;
        metric = this.createMetric('CLS', value);
      }
    }

    if (metric) {
      this.addMetric(metric);
    }
  }

  private trackNavigationTiming() {
    if (!('performance' in window) || !('getEntriesByType' in performance)) {
      return;
    }

    window.addEventListener('load', () => {
      setTimeout(() => {
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (!navEntry) return;

        // First Contentful Paint
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          this.addMetric(this.createMetric('FCP', fcpEntry.startTime));
        }

        // Time to First Byte
        const ttfb = navEntry.responseStart - navEntry.requestStart;
        this.addMetric(this.createMetric('TTFB', ttfb));

        // DOM Content Loaded
        const dcl = navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart;
        this.addMetric(this.createMetric('DCL', dcl));

        // Total Load Time
        const loadTime = navEntry.loadEventEnd - navEntry.loadEventStart;
        this.addMetric(this.createMetric('LoadTime', loadTime));
      }, 0);
    });
  }

  private trackResourceTiming() {
    if (!('performance' in window)) return;

    // Track slow resources
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceEntry = entry as PerformanceResourceTiming;
        const duration = resourceEntry.duration;
        
        // Flag slow resources (>1s)
        if (duration > 1000) {
          console.warn(`[PerformanceMonitor] Slow resource: ${resourceEntry.name} (${duration.toFixed(2)}ms)`);
        }
      }
    });

    try {
      observer.observe({ type: 'resource', buffered: true });
    } catch (_e) {
      // Not supported
    }
  }

  private createMetric(name: string, value: number): PerformanceMetric {
    const threshold = THRESHOLDS[name];
    let rating: 'good' | 'needs-improvement' | 'poor' = 'good';

    if (threshold) {
      if (value > threshold.needsImprovement) {
        rating = 'poor';
      } else if (value > threshold.good) {
        rating = 'needs-improvement';
      }
    }

    return {
      name,
      value,
      rating,
      timestamp: Date.now(),
    };
  }

  private addMetric(metric: PerformanceMetric) {
    // Replace existing metric with same name
    const index = this.metrics.findIndex(m => m.name === metric.name);
    if (index !== -1) {
      this.metrics[index] = metric;
    } else {
      this.metrics.push(metric);
    }

    // Enforce max metrics limit
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // Add to pending batch
    this.pendingMetrics.push(metric);

    // Log metric in development
    if (import.meta.env.DEV) {
      console.log(`[PerformanceMonitor] ${metric.name}: ${metric.value.toFixed(2)}ms [${metric.rating}]`);
    }

    // Batch send when threshold reached
    if (this.pendingMetrics.length >= this.BATCH_SIZE) {
      this.sendMetrics();
    }
  }

  private async sendMetrics() {
    if (this.pendingMetrics.length === 0) return;

    const metricsToSend = [...this.pendingMetrics];
    this.pendingMetrics = [];

    // In production, send to analytics endpoint
    if (!import.meta.env.DEV) {
      try {
        // Use sendBeacon for reliability (doesn't block page unload)
        if ('sendBeacon' in navigator) {
          const data = JSON.stringify({
            metrics: metricsToSend,
            userAgent: navigator.userAgent,
            url: window.location.href,
          });
          
          navigator.sendBeacon('/api/analytics/performance', data);
        }
      } catch (error) {
        console.error('[PerformanceMonitor] Failed to send metrics:', error);
      }
    }
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getMetricsSummary() {
    const summary: Record<string, { value: number; rating: string }> = {};
    
    this.metrics.forEach(metric => {
      summary[metric.name] = {
        value: metric.value,
        rating: metric.rating,
      };
    });

    return summary;
  }

  public clearMetrics() {
    this.metrics = [];
    this.pendingMetrics = [];
  }

  public destroy() {
    this.observer?.disconnect();
    this.sendMetrics(); // Send remaining metrics
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-expose in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { performanceMonitor: typeof performanceMonitor }).performanceMonitor = performanceMonitor;
}

// Send metrics before page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceMonitor.destroy();
  });
}
