import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface AdminAccessResult {
  isAdmin: boolean;
  loading: boolean;
  error: Error | null;
}

/**
 * Server-side validated admin access hook
 * Uses edge function to prevent client-side privilege escalation
 */
export const useAdminAccess = (user: User | null): AdminAccessResult => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data: session } = await supabase.auth.getSession();
        
        if (!session.session?.access_token) {
          throw new Error('No valid session');
        }

        // Call server-side validation
        const { data, error: fnError } = await supabase.functions.invoke(
          'check-admin-access',
          {
            headers: {
              Authorization: `Bearer ${session.session.access_token}`,
            },
          }
        );

        if (fnError) {
          throw fnError;
        }

        setIsAdmin(data?.isAdmin === true);
      } catch (err) {
        console.error('Admin access check failed:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [user]);

  return { isAdmin, loading, error };
};
