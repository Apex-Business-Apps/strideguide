// @stride/value-pillars v1
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Navigation, Search, Phone } from 'lucide-react';

export const ValuePillars: React.FC = () => {

  const pillars = [
    {
      icon: Navigation,
      title: 'Real-Time Obstacle Detection',
      description: 'AI-powered vision alerts you to obstacles, steps, and hazards before you encounter them',
    },
    {
      icon: Search,
      title: 'Lost Item Finder',
      description: 'Teach StrideGuide your keys, wallet, or phone - find them instantly with audio cues',
    },
    {
      icon: Phone,
      title: 'Emergency SOS',
      description: 'One-touch emergency contact with automatic location sharing and fall detection',
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30" aria-labelledby="features-heading">
      <div className="max-w-7xl mx-auto">
        <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold text-center text-foreground mb-12">
          Everything You Need for Safe Navigation
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <Card key={idx} className="border-border bg-card">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-card-foreground">{pillar.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
