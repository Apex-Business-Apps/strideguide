import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Crown, ExternalLink, AlertCircle, CheckCircle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { PricingPlans } from "./PricingPlans";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { telemetry } from "@/utils/Telemetry";

interface SubscriptionManagerProps {
  user: User;
}

export const SubscriptionManager = ({ user }: SubscriptionManagerProps) => {
  const { toast } = useToast();
  const { isPaymentsEnabled, enableEdgeCheck } = useFeatureFlags() as { isPaymentsEnabled: boolean; enableEdgeCheck: boolean };
  const { subscription, isLoading, refreshSubscription } = useSubscription(user);
  const [showPricing, setShowPricing] = useState(false);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [usageData, setUsageData] = useState({ current: 0, limit: 0 });

  useEffect(() => {
    if (subscription) {
      loadUsageData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscription]);

  const loadUsageData = useCallback(async () => {
    if (!subscription) return;

    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('api_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      if (!error) {
        setUsageData({
          current: count || 0,
          limit: subscription.max_api_calls === -1 ? 999999 : subscription.max_api_calls,
        });
      }
    } catch (error) {
      console.error("Error loading usage data:", error);
    }
  }, [subscription, user.id]);

  const handleSelectPlan = async (planId: string, isYearly: boolean) => {
    // Gate payments behind feature flag
    if (!isPaymentsEnabled) {
      toast({
        title: "Payments Disabled",
        description: "Payment processing is currently disabled. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingCheckout(true);

    try {
      await telemetry.trackWithLatency('checkout_open', async () => {
        if (!enableEdgeCheck) {
          throw new Error('Edge functions disabled');
        }
        const successUrl = `${window.location.origin}/dashboard?checkout=success`;
        const cancelUrl = `${window.location.origin}/dashboard?checkout=cancelled`;

        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: {
            planId,
            isYearly,
            successUrl,
            cancelUrl,
            idempotencyKey: `checkout-${user.id}-${Date.now()}`,
          },
        });

        if (error) throw error;

        if (data?.url) {
          window.location.href = data.url;
        } else {
          throw new Error('No checkout URL returned');
        }
      }, { planId, isYearly });
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast({
        title: "Checkout Unavailable",
        description: enableEdgeCheck ? "Failed to create checkout session. Please try again." : "Disabled in crisis mode.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  const openCustomerPortal = async () => {
    // Gate payments behind feature flag
    if (!isPaymentsEnabled) {
      toast({
        title: "Payments Disabled",
        description: "Payment management is currently disabled. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    try {
      await telemetry.trackWithLatency('portal_open', async () => {
        if (!enableEdgeCheck) {
          throw new Error('Edge functions disabled');
        }
        const returnUrl = `${window.location.origin}/dashboard`;

        const { data, error } = await supabase.functions.invoke('customer-portal', {
          body: { returnUrl },
        });

        if (error) throw error;

        if (data?.url) {
          window.location.href = data.url;
        } else {
          throw new Error('No portal URL returned');
        }
      });
    } catch (error) {
      console.error("Error opening customer portal:", error);
      toast({
        title: "Billing Portal Unavailable",
        description: enableEdgeCheck ? "Failed to open billing portal. Please try again." : "Disabled in crisis mode.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardHeader className="h-32 bg-muted"></CardHeader>
          <CardContent className="h-24 bg-muted/50"></CardContent>
        </Card>
      </div>
    );
  }

  if (showPricing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Choose Your Plan</h2>
            <p className="text-muted-foreground">Select the plan that best fits your needs</p>
          </div>
          <Button variant="outline" onClick={() => setShowPricing(false)}>
            Back to Dashboard
          </Button>
        </div>
        <PricingPlans 
          currentPlan={subscription?.plan_name}
          onSelectPlan={handleSelectPlan}
        />
      </div>
    );
  }

  const getStatusIcon = () => {
    if (!subscription || subscription.status === 'free') {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
    if (subscription.status === 'active') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusText = () => {
    if (!subscription || subscription.status === 'free') return 'Free Plan';
    return subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1);
  };

  const usagePercentage = usageData.limit === 0 ? 0 : (usageData.current / usageData.limit) * 100;
  const isUsageCritical = usagePercentage > 80;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Subscription Management</h2>
          <p className="text-muted-foreground">Manage your plan and billing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPricing(true)}>
            View All Plans
          </Button>
          {subscription && subscription.status !== 'free' && (
            <Button onClick={openCustomerPortal}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Billing Portal
            </Button>
          )}
        </div>
      </div>

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="flex items-center gap-2">
                  {subscription?.plan_name || 'Free'} Plan
                  <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'}>
                    {getStatusText()}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {subscription?.current_period_end 
                    ? `Next billing date: ${new Date(subscription.current_period_end).toLocaleDateString()}`
                    : 'No active subscription'
                  }
                </CardDescription>
              </div>
            </div>
            {getStatusIcon()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Features */}
          <div>
            <h4 className="font-semibold mb-2">Plan Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Array.isArray(subscription?.plan_features) && subscription.plan_features.map((feature, index) => (
                <div key={index} className="flex items-center text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Usage Tracking */}
          {subscription && subscription.max_api_calls !== -1 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">API Usage This Month</h4>
                <span className={`text-sm ${isUsageCritical ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                  {usageData.current.toLocaleString()} / {usageData.limit.toLocaleString()} calls
                </span>
              </div>
              <Progress 
                value={usagePercentage} 
                className={`h-3 ${isUsageCritical ? 'bg-red-100' : ''}`}
              />
              {isUsageCritical && (
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ You're approaching your usage limit. Consider upgrading your plan.
                </p>
              )}
            </div>
          )}

          {/* Plan Benefits Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {subscription?.max_api_calls === -1 ? '∞' : subscription?.max_api_calls.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">API Calls/Month</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {subscription?.max_users === -1 ? '∞' : subscription?.max_users}
              </div>
              <div className="text-sm text-muted-foreground">Team Members</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {subscription?.priority_support ? '✓' : '✗'}
              </div>
              <div className="text-sm text-muted-foreground">Priority Support</div>
            </div>
          </div>

          {/* Upgrade CTA */}
          {(!subscription || subscription.status === 'free') && (
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Unlock More Features</h4>
                  <p className="text-sm text-muted-foreground">
                    Upgrade to access advanced ML features, priority support, and higher usage limits.
                  </p>
                </div>
                <Button onClick={() => setShowPricing(true)}>
                  Upgrade Now
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};