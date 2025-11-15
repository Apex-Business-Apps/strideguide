// @stride/install-guide v1
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Smartphone, Share2 } from 'lucide-react';

export const InstallGuide: React.FC = () => {

  const steps = [
    {
      icon: Smartphone,
      platform: 'Android / Desktop',
      instruction: 'Tap the install prompt or menu → Install StrideGuide',
    },
    {
      icon: Share2,
      platform: 'iPhone / iPad',
      instruction: 'Tap Share → Add to Home Screen → Done',
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background" aria-labelledby="install-heading">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10 space-y-3">
          <h2 id="install-heading" className="text-3xl sm:text-4xl font-bold text-foreground">Install in Seconds - No App Store Required</h2>
          <p className="text-lg text-muted-foreground">
            Works on any smartphone. No downloads from app stores, no accounts needed - just tap and start navigating safely.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <Card key={idx} className="border-border">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-primary" aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">{step.platform}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.instruction}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
