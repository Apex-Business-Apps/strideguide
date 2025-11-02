import React from 'react';
import { Check, ArrowLeft, Crown, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { SEOHead } from '@/components/SEOHead';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

interface PricingPageProps {
  onBack: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const flags = useFeatureFlags();

  const handleUpgrade = async () => {
    try {
      if (!flags.enableEdgeCheck) throw new Error('Edge functions disabled');
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: plans } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('name', 'Pro')
        .eq('is_active', true)
        .single();

      if (!plans) {
        alert('Pro plan not available. Please contact support.');
        return;
      }

      const successUrl = `${window.location.origin}/dashboard?upgrade=success`;
      const cancelUrl = `${window.location.origin}/pricing?upgrade=cancelled`;

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          planId: plans.id,
          isYearly: false,
          successUrl,
          cancelUrl,
          idempotencyKey: `upgrade-${Date.now()}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Upgrade temporarily unavailable. Please try again later.');
    }
  };

  const handleGetStrap = () => {
    // Open email to request neck strap
    const subject = encodeURIComponent('Free Neck Strap Request - StrideGuide Pro');
    const body = encodeURIComponent(`Hi StrideGuide Team,

I would like to request my free neck strap as a StrideGuide Pro subscriber.

My details:
- Subscription: Pro
- Preferred color: [Black/Blue/Red]
- Shipping address: [Please provide]

Thanks!`);
    
    window.open(`mailto:support@strideguide.ca?subject=${subject}&body=${body}`);
  };

  const freeFeatures = t('pricing.free.features', { returnObjects: true }) as string[];
  const paidFeatures = t('pricing.paid.features', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen bg-background p-6">
      <SEOHead
        title="Pricing - StrideGuide | Free & Pro Plans for Vision Assistance"
        description="Choose your plan: Free plan with 2 hours daily guidance or Pro plan with 8 hours, priority support, and free neck strap. Affordable vision assistance for blind and low vision users."
        canonical="https://strideguide.cam/pricing"
      />
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="min-h-[44px] px-3"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{t('pricing.title')}</h1>
        </div>

        {/* Free Plan */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{t('pricing.free.name')}</CardTitle>
              <Badge variant="outline">Current</Badge>
            </div>
            <p className="text-3xl font-bold">{t('pricing.free.price')}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {freeFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="border-2 border-primary bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                {t('pricing.paid.name')}
              </CardTitle>
              <Badge className="bg-primary text-primary-foreground">Pro</Badge>
            </div>
            <p className="text-3xl font-bold">{t('pricing.paid.price')}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {paidFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  <span className="text-sm font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Button
                onClick={handleUpgrade}
                className="w-full min-h-[48px] text-lg font-semibold"
                aria-label={t('pricing.upgrade')}
              >
                {t('pricing.upgrade')}
              </Button>

              <Button
                onClick={handleGetStrap}
                variant="outline"
                className="w-full min-h-[48px] text-sm"
                aria-label={t('pricing.getStrap')}
              >
                <Gift className="h-4 w-4 mr-2" />
                {t('pricing.getStrap')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Strap Info */}
        <Card className="bg-accent/10 border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Gift className="h-5 w-5 text-accent mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-sm">Free Neck Strap Included</p>
                <p className="text-xs text-muted-foreground">
                  StrideGuide Pro subscribers get a free breakaway safety neck strap. 
                  Keep your phone secure and accessible during guidance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Usage Info */}
        <div className="text-center space-y-2 pt-4">
          <p className="text-sm text-muted-foreground">
            Daily usage resets at midnight (local time)
          </p>
          <p className="text-xs text-muted-foreground">
            Free tier: 2 hours • Pro tier: 8 hours
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;