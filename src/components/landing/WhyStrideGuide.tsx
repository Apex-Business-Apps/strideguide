// @stride/why-section v1
import React from 'react';
import { Check } from 'lucide-react';

export const WhyStrideGuide: React.FC = () => {

  const benefits = [
    'Works 100% offline - no data charges, no connection needed',
    'AI runs on your phone - instant obstacle detection without cloud delays',
    'Your camera never sends images anywhere - complete privacy guaranteed',
    'Full bilingual support - seamlessly switch between English and French',
    'Designed for accessibility - large touch targets, voice commands, screen reader optimized',
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background" aria-labelledby="why-strideguide">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div className="space-y-6">
            <h2 id="why-strideguide" className="text-3xl sm:text-4xl font-bold text-foreground">
              Complete Independence, Zero Internet Required
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Most navigation apps need constant internet and send your location to servers. StrideGuide is different - it runs 100% on your device with complete offline functionality. Your camera data never leaves your phone, ensuring total privacy while providing instant obstacle detection without cloud delays.
            </p>
          </div>

          {/* Right: Checklist */}
          <div className="space-y-4">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="mt-0.5 w-6 h-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-success" aria-hidden="true" />
                </div>
                <p className="text-base text-foreground font-medium">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
