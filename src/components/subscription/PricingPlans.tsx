import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { telemetry } from "@/utils/Telemetry";

interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  stripe_price_id: string;
  stripe_yearly_price_id: string;
  features: string[] | unknown;
  max_api_calls: number;
  max_users: number;
  priority_support: boolean;
  white_label: boolean;
}

interface PricingPlansProps {
  currentPlan?: string;
  onSelectPlan: (planId: string, isYearly: boolean) => void;
}

const planIcons = {
  Basic: Zap,
  Premium: Crown,
  Enterprise: Building,
};

const planColors = {
  Basic: "bg-blue-50 border-blue-200",
  Premium: "bg-purple-50 border-purple-200 ring-2 ring-purple-500",
  Enterprise: "bg-gold-50 border-gold-200",
};

export const PricingPlans = ({ currentPlan, onSelectPlan }: PricingPlansProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isPaymentsEnabled } = useFeatureFlags();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPlans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly");

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load pricing plans",
          variant: "destructive",
        });
        return;
      }

      setPlans(data || []);
    } catch (error) {
      console.error("Error loading plans:", error);
      toast({
        title: "Error",
        description: "Failed to load pricing plans",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleSelectPlan = (planId: string) => {
    // Gate payments behind feature flag
    if (!isPaymentsEnabled) {
      toast({
        title: "Payments Disabled",
        description: "Payment processing is currently disabled. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    telemetry.track('checkout_open', { planId, isYearly });
    setSelectedPlan(planId);
    onSelectPlan(planId, isYearly);
  };

  const formatApiCalls = (calls: number) => {
    if (calls === -1) return "Unlimited";
    if (calls >= 1000) return `${calls / 1000}K`;
    return calls.toString();
  };

  const formatUsers = (users: number) => {
    if (users === -1) return "Unlimited";
    return users.toString();
  };

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-32 bg-muted"></CardHeader>
            <CardContent className="h-64 bg-muted/50"></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Billing Toggle */}
      <div className="flex items-center justify-center space-x-4">
        <span className={`text-sm ${!isYearly ? 'font-semibold' : 'text-muted-foreground'}`}>
          Monthly
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsYearly(!isYearly)}
          className="relative h-8 w-16"
        >
          <div
            className={`absolute top-1 h-6 w-6 rounded-full bg-primary transition-transform duration-200 ${
              isYearly ? 'translate-x-8' : 'translate-x-1'
            }`}
          />
        </Button>
        <span className={`text-sm ${isYearly ? 'font-semibold' : 'text-muted-foreground'}`}>
          Yearly
          <Badge variant="secondary" className="ml-2">Save 17%</Badge>
        </span>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = planIcons[plan.name as keyof typeof planIcons] || Zap;
          const price = isYearly ? plan.price_yearly : plan.price_monthly;
          const isPopular = plan.name === "Premium";
          const isCurrent = currentPlan === plan.name;

          return (
            <Card
              key={plan.id}
              className={`relative transition-all duration-200 hover:shadow-lg ${
                planColors[plan.name as keyof typeof planColors] || ""
              } ${selectedPlan === plan.id ? "ring-2 ring-primary" : ""}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center mb-2">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-sm">
                  {plan.name === "Basic" && "Perfect for individuals getting started"}
                  {plan.name === "Premium" && "Best for growing teams and businesses"}
                  {plan.name === "Enterprise" && "Advanced features for large organizations"}
                </CardDescription>
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-3xl font-bold">${price}</span>
                  <span className="text-muted-foreground">/{isYearly ? 'year' : 'month'}</span>
                </div>
                {isYearly && (
                  <div className="text-sm text-muted-foreground">
                    ${(price / 12).toFixed(2)}/month billed annually
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {Array.isArray(plan.features) ? plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  )) : null}
                  
                  <div className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{formatApiCalls(plan.max_api_calls)} API calls/month</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Up to {formatUsers(plan.max_users)} team members</span>
                  </div>
                  
                  {plan.priority_support && (
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">Priority support</span>
                    </div>
                  )}
                  
                  {plan.white_label && (
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">White-label branding</span>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : isPopular ? "default" : "secondary"}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrent}
                >
                  {isCurrent ? "Current Plan" : `Get Started with ${plan.name}`}
                </Button>

                {plan.name === "Enterprise" && (
                  <p className="text-xs text-center text-muted-foreground">
                    Contact sales for custom pricing and features
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>All plans include a 14-day free trial. Cancel anytime.</p>
        <p className="mt-1">Need help choosing? <Button variant="link" className="p-0 h-auto">Contact our sales team</Button></p>
      </div>
    </div>
  );
};