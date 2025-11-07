/**
 * CSRF Token Hook
 * Manages CSRF tokens for protected operations
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CsrfTokenState {
  token: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to manage CSRF tokens for admin operations
 * Automatically refreshes token every 50 minutes (before 1-hour expiry)
 */
export const useCsrfToken = () => {
  const [state, setState] = useState<CsrfTokenState>({
    token: null,
    loading: true,
    error: null,
  });

  const fetchToken = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('csrf-token');

      if (error) {
        throw new Error(error.message || 'Failed to fetch CSRF token');
      }

      if (!data?.token) {
        throw new Error('No token received');
      }

      setState({
        token: data.token,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('[useCsrfToken] Failed to fetch token:', err);
      setState({
        token: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch CSRF token',
      });
    }
  }, []);

  // Fetch token on mount
  useEffect(() => {
    fetchToken();

    // Refresh token every 50 minutes (before 1-hour expiry)
    const interval = setInterval(fetchToken, 50 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchToken]);

  /**
   * Get headers for protected requests
   */
  const getCsrfHeaders = useCallback((): Record<string, string> => {
    if (!state.token) {
      throw new Error('CSRF token not available');
    }

    return {
      'x-csrf-token': state.token,
    };
  }, [state.token]);

  /**
   * Refresh the CSRF token manually
   */
  const refreshToken = useCallback(() => {
    return fetchToken();
  }, [fetchToken]);

  return {
    token: state.token,
    loading: state.loading,
    error: state.error,
    getCsrfHeaders,
    refreshToken,
  };
};
