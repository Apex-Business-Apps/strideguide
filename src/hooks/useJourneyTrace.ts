import { useEffect, useRef } from 'react';
import { telemetryTracker } from '@/utils/TelemetryTracker';

type JourneyName = 'start_guidance' | 'find_item' | 'settings_save';

/**
 * Hook to automatically track user journey lifecycle
 * Usage: const trace = useJourneyTrace('start_guidance', { camera: 'rear' });
 *        trace.complete();  or  trace.fail('permission denied');
 */
export const useJourneyTrace = (
  journey: JourneyName,
  metadata?: Record<string, any>
) => {
  const journeyKeyRef = useRef<string | null>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Start journey on mount
    if (!hasStartedRef.current) {
      journeyKeyRef.current = telemetryTracker.startJourney(journey, metadata);
      hasStartedRef.current = true;
    }

    // Auto-complete on unmount if not manually completed
    return () => {
      if (journeyKeyRef.current && hasStartedRef.current) {
        telemetryTracker.completeJourney(journeyKeyRef.current, journey, metadata);
      }
    };
  }, [journey, metadata]);

  return {
    complete: (extraMetadata?: Record<string, any>) => {
      if (journeyKeyRef.current) {
        telemetryTracker.completeJourney(
          journeyKeyRef.current,
          journey,
          { ...metadata, ...extraMetadata }
        );
        journeyKeyRef.current = null;
        hasStartedRef.current = false;
      }
    },

    fail: (error: string, extraMetadata?: Record<string, any>) => {
      if (journeyKeyRef.current) {
        telemetryTracker.failJourney(
          journeyKeyRef.current,
          journey,
          error,
          { ...metadata, ...extraMetadata }
        );
        journeyKeyRef.current = null;
        hasStartedRef.current = false;
      }
    },
  };
};
