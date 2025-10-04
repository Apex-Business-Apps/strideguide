import React from 'react';
import { useTranslation } from 'react-i18next';

export const InterfacePreview: React.FC = () => {
  const { i18n } = useTranslation();

  return (
    <section 
      className="py-16 px-4 bg-gradient-to-b from-background to-muted/20"
      aria-labelledby="interface-preview-heading"
    >
      <div className="container mx-auto max-w-6xl">
        <h2 
          id="interface-preview-heading"
          className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground"
        >
          {i18n.language === 'en' ? 'See the interface' : 'Aperçu de l\'interface'}
        </h2>
        
        <div className="max-w-4xl mx-auto">
          <figure className="bg-card rounded-lg shadow-2xl overflow-hidden border border-border">
            <img 
              src="/screenshot-interface.png" 
              alt="Screenshot of StrideGuide home screen"
              className="w-full h-auto"
              loading="lazy"
            />
            <figcaption className="p-6 bg-card border-t border-border">
              <p className="text-sm md:text-base text-muted-foreground text-center">
                {i18n.language === 'en' 
                  ? 'The StrideGuide interface showing privacy consent, offline vision processing, and core navigation features.'
                  : 'L\'interface StrideGuide montrant le consentement de confidentialité, le traitement de vision hors ligne et les fonctionnalités de navigation principales.'}
              </p>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
};
