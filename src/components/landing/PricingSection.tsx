// @stride/pricing-section v1
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PricingSectionProps {
  onInstall: () => void;
  onUpgrade: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onInstall, onUpgrade }) => {

  const plans = [
    {
      name: 'Free Core',
      description: 'Limited features after trial ends',
      cta: 'Start Free Trial',
      action: onInstall,
      variant: 'outline' as const,
      features: [
        '14-day free trial (all features)',
        'After trial: 1 hour guidance/day',
        'Basic obstacle detection',
        'Emergency SOS',
        'Lost item finder (1 item)',
        'Works completely offline',
        'No credit card required'
      ],
    },
    {
      name: 'Premium',
      description: 'Full access for extended daily use',
      cta: 'Start 14-Day Free Trial',
      action: onUpgrade,
      variant: 'default' as const,
      popular: true,
      features: [
        '14-day free trial included',
        '8 hours guidance per day',
        'Night vision mode',
        'Unlimited lost items',
        'Priority support',
        'Free neck strap included',
        'Cancel anytime'
      ],
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12 space-y-4 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Simple, transparent pricing</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Start free, upgrade when you need more hours or night mode.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {plans.map((plan, idx) => (
            <Card 
              key={idx} 
              className={`relative transition-all duration-300 hover:shadow-xl ${
                plan.popular 
                  ? 'border-primary shadow-lg scale-105' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground shadow-md">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold tracking-tight">{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground pt-2 leading-relaxed">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 ring-2 ring-primary/20" aria-hidden="true" />
                      <span className="text-card-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={plan.action}
                  variant={plan.variant}
                  size="lg"
                  className="w-full min-h-[48px] font-semibold"
                  aria-label={plan.cta}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
