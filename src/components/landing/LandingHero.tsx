// @stride/landing-hero v2
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LandingHeroProps {
  onInstall: () => void;
  onSeePremium: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onInstall, onSeePremium }) => {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(newLang);
    document.documentElement.lang = newLang;
  };

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#0B1220' }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div className="space-y-8 text-white">
            <div className="space-y-6">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                {i18n.language === 'en' ? 'Offline seeing-eye assistance.' : 'Assistant de guidage hors ligne.'}
              </h1>
              <h2 className="text-xl sm:text-2xl text-white/90 max-w-2xl">
                {i18n.language === 'en' 
                  ? 'Obstacle alerts, guidance, and SOS. EN/FR. Works offline.'
                  : 'Alertes d\'obstacles, guidage et SOS. EN/FR. Fonctionne hors ligne.'}
              </h2>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={onInstall}
                size="lg"
                className="min-h-[52px] text-base font-semibold px-8 bg-white text-black hover:bg-white/90"
                aria-label={i18n.language === 'en' ? 'Start Guidance' : 'Démarrer le guidage'}
              >
                {i18n.language === 'en' ? 'Start Guidance' : 'Démarrer le guidage'}
              </Button>
              <Button
                onClick={onSeePremium}
                variant="outline"
                size="lg"
                className="min-h-[52px] text-base font-semibold px-8 border-white text-white hover:bg-white/10"
                aria-label={i18n.language === 'en' ? 'Find Lost Item' : 'Retrouver un objet'}
              >
                {i18n.language === 'en' ? 'Find Lost Item' : 'Retrouver un objet'}
              </Button>
            </div>

            {/* Language toggle */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLanguage}
                className="min-h-[44px] text-white hover:bg-white/10"
              >
                {i18n.language === 'en' ? 'EN' : 'FR'} | {i18n.language === 'en' ? 'FR' : 'EN'}
              </Button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3 pt-4">
              {t('badges').split(' • ').map((badge, idx) => (
                <Badge key={idx} variant="secondary" className="px-3 py-1.5 text-sm font-medium bg-white/10 text-white border-white/20">
                  {badge}
                </Badge>
              ))}
            </div>
          </div>

          {/* Right: CSS Phone Frame */}
          <div className="relative">
            <div className="relative mx-auto w-full max-w-sm aspect-[9/19] bg-white/5 rounded-3xl border-4 border-white/10 shadow-2xl overflow-hidden p-6 flex items-center justify-center">
              <svg 
                className="w-full h-auto opacity-20"
                viewBox="0 0 200 400" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-hidden="true"
              >
                <rect x="20" y="80" width="160" height="60" rx="8" fill="white" opacity="0.3"/>
                <rect x="20" y="160" width="160" height="60" rx="8" fill="white" opacity="0.3"/>
                <rect x="20" y="240" width="160" height="60" rx="8" fill="white" opacity="0.3"/>
                <circle cx="100" cy="340" r="30" fill="white" opacity="0.4"/>
              </svg>
            </div>
            {/* Decorative gradient blur */}
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
};
