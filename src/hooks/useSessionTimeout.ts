import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

/**
 * Hook to monitor session expiry and warn users before timeout
 * Checks every 60 seconds and warns when <5 minutes remain
 */
export const useSessionTimeout = () => {
  const { toast } = useToast();
  const [sessionExpiry, setSessionExpiry] = useState<number | null>(null);
  const [warningShown, setWarningShown] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        // Supabase sessions expire after 1 hour by default
        // Calculate expiry time from session creation
        const expiresAt = data.session.expires_at ? data.session.expires_at * 1000 : null;
        setSessionExpiry(expiresAt);
      } else {
        setSessionExpiry(null);
        setWarningShown(false);
      }
    };

    // Check immediately
    checkSession();

    // Check every 60 seconds
    const interval = setInterval(checkSession, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!sessionExpiry || warningShown) return;

    const now = Date.now();
    const timeRemaining = sessionExpiry - now;
    const fiveMinutes = 5 * 60 * 1000;

    // Warn when less than 5 minutes remain
    if (timeRemaining > 0 && timeRemaining < fiveMinutes) {
      const minutesLeft = Math.ceil(timeRemaining / 60000);

      toast({
        title: 'Session Expiring Soon',
        description: `Your session will expire in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}. Please save your work and refresh to continue.`,
        duration: 0, // Don't auto-dismiss
        variant: 'default',
      });

      setWarningShown(true);
    }
  }, [sessionExpiry, warningShown, toast]);

  return {
    sessionExpiry,
    timeRemaining: sessionExpiry ? Math.max(0, sessionExpiry - Date.now()) : null,
  };
};
