// @stride/faq v1
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const FAQ: React.FC = () => {
  const { t } = useTranslation();

  const faqs = [
    { 
      q: 'Does StrideGuide really work completely offline?', 
      a: 'Yes! StrideGuide processes everything on your device. Once installed, you never need an internet connection for obstacle detection, voice guidance, or any core features. Perfect for users without data plans or in areas with poor reception.' 
    },
    { 
      q: t('faq_trial_q'), 
      a: t('faq_trial_a')
    },
    { 
      q: 'Will this work with my screen reader?', 
      a: 'Yes! StrideGuide is fully compatible with VoiceOver (iOS) and TalkBack (Android). All buttons have descriptive labels, and we use proper ARIA semantics throughout the app.' 
    },
    { 
      q: 'How accurate is the obstacle detection?', 
      a: 'Our AI model achieves 92% accuracy for common obstacles (steps, curbs, poles, people). The AI runs directly on your phone using TensorFlow Lite, providing near-instant alerts without cloud delays.' 
    },
    { 
      q: 'What phones does this work on?', 
      a: 'StrideGuide works on any modern smartphone (iPhone 8+ or Android 9+). As a Progressive Web App, there\'s no app store download required - just visit our website and install.' 
    },
    { 
      q: 'How does the emergency SOS work?', 
      a: 'Press and hold the SOS button for 3 seconds. StrideGuide will automatically send a text message to your emergency contact with your location (if GPS available). The app also includes fall detection that automatically triggers SOS if a hard fall is detected.' 
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background" aria-labelledby="faq-heading">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 id="faq-heading" className="text-3xl sm:text-4xl font-bold text-foreground">Common Questions Answered</h2>
          <p className="mt-4 text-lg text-muted-foreground">Everything you need to know about StrideGuide</p>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`} className="border border-border rounded-lg px-6 bg-card">
              <AccordionTrigger className="text-left text-base font-semibold text-card-foreground hover:no-underline py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
