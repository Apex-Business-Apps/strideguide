import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/ProductionLogger";
import { useAdminAccess } from "@/hooks/useAdminAccess";

interface SubscriptionData {
  id: string;
  plan_name: string;
  plan_features: string[] | unknown;
  max_api_calls: number;
  max_users: number;
  priority_support: boolean;
  white_label: boolean;
  status: string;
  current_period_end: string;
}

interface UseSubscriptionReturn {
  subscription: SubscriptionData | null;
  isLoading: boolean;
  hasFeatureAccess: (featureName: string) => boolean;
  checkUsageLimit: (endpoint: string) => Promise<boolean>;
  trackApiUsage: (endpoint: string, method: string, statusCode: number) => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

export const useSubscription = (user: User | null): UseSubscriptionReturn => {
  const { isAdmin } = useAdminAccess(user);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSubscription = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_user_subscription', {
        user_uuid: user.id
      });

      if (error) {
        logger.error("Error loading subscription", { error: error.message });
        return;
      }

      if (data && data.length > 0) {
        setSubscription({
          id: data[0].plan_name || 'unknown',
          ...data[0]
        });
      } else {
        // User has no active subscription - they're on free tier
        setSubscription({
          id: 'free',
          plan_name: 'Free',
          plan_features: ['Basic Features', 'Limited API Calls'],
          max_api_calls: 100,
          max_users: 1,
          priority_support: false,
          white_label: false,
          status: 'free',
          current_period_end: '',
        });
      }
    } catch (error) {
      logger.error("Error loading subscription", { error });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSubscription();
    } else {
      setSubscription(null);
      setIsLoading(false);
    }
  }, [user, loadSubscription]);

  const hasFeatureAccess = (featureName: string): boolean => {
    if (!user || !subscription) return false;

    // Admins have access to all features
    if (isAdmin) return true;

    // For plan-based features - only gate specific premium features
    const planLevel = {
      'Free': 0,
      'Basic': 1,
      'Premium': 2,
      'Enterprise': 3,
    }[subscription.plan_name] || 0;

    const featureRequirements = {
      'hazard_notification_screen': 2,
      'enhanced_notifications': 2,
    };

    const requiredLevel = featureRequirements[featureName as keyof typeof featureRequirements];
    return requiredLevel ? planLevel >= requiredLevel : true;
  };

  const checkUsageLimit = async (_endpoint: string): Promise<boolean> => {
    if (!user || !subscription) return false;

    // Admins have unlimited access
    if (isAdmin) return true;

    // Unlimited plans (-1) always have access
    if (subscription.max_api_calls === -1) return true;

    try {
      // Get current month's usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('api_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      if (error) {
        logger.error("Error checking usage", { error: error.message });
        return false;
      }

      const currentUsage = count || 0;
      return currentUsage < subscription.max_api_calls;
    } catch (error) {
      logger.error("Error checking usage limit", { error });
      return false;
    }
  };

  const trackApiUsage = async (
    endpoint: string, 
    method: string, 
    statusCode: number
  ): Promise<void> => {
    if (!user) return;

    try {
      await supabase
        .from('api_usage')
        .insert({
          user_id: user.id,
          endpoint,
          method,
          status_code: statusCode,
          response_time_ms: Math.floor(Math.random() * 1000), // Mock response time
          request_size_bytes: 1024, // Mock request size
          response_size_bytes: 2048, // Mock response size
        });
    } catch (error) {
      logger.error("Error tracking API usage", { error, endpoint, method });
    }
  };

  const refreshSubscription = async (): Promise<void> => {
    await loadSubscription();
  };

  return {
    subscription,
    isLoading,
    hasFeatureAccess,
    checkUsageLimit,
    trackApiUsage,
    refreshSubscription,
  };
};