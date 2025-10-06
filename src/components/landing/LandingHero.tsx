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
    <section 
      className="relative py-20 px-4 sm:px-6 lg:px-8 bg-hero-bg overflow-hidden" 
      aria-labelledby="hero-heading"
    >
      {/* Gradient background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-hero-bg via-hero-bg to-primary/10 -z-10" aria-hidden="true" />
      
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div className="space-y-8 text-hero-fg animate-fade-in">
            <div className="space-y-6">
              <h1 id="hero-heading" className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
                {i18n.language === 'en' ? 'Navigate Safely with Vision Guidance' : 'Naviguez en sécurité avec un guidage visuel'}
              </h1>
              <p className="text-xl sm:text-2xl text-hero-fg/90 max-w-2xl leading-relaxed">
                {i18n.language === 'en' 
                  ? 'Navigate independently with real-time obstacle detection, voice guidance, and emergency features. Works completely offline.'
                  : 'Naviguez en toute autonomie avec détection d\'obstacles en temps réel, guidage vocal et fonctions d\'urgence. Fonctionne entièrement hors ligne.'}
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={onInstall}
                variant="hero"
                size="lg"
                className="min-h-[52px] text-base px-8"
                aria-label={i18n.language === 'en' ? 'Start Guidance' : 'Démarrer le guidage'}
              >
                {i18n.language === 'en' ? 'Start Guidance' : 'Démarrer le guidage'}
              </Button>
              <Button
                onClick={onSeePremium}
                variant="hero-outline"
                size="lg"
                className="min-h-[52px] text-base px-8"
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
                className="min-h-[44px] text-hero-fg hover:bg-hero-fg/10"
              >
                {i18n.language === 'en' ? 'EN' : 'FR'} | {i18n.language === 'en' ? 'FR' : 'EN'}
              </Button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3 pt-4" role="list" aria-label="Key features">
              <Badge 
                variant="secondary" 
                className="px-3 py-1.5 text-sm font-medium bg-hero-fg/10 text-hero-fg border-hero-fg/20 backdrop-blur-sm"
                role="listitem"
                aria-label={t('trial_cta')}
              >
                {`✓ ${t('badge_free')}`}
              </Badge>
              <Badge 
                variant="secondary" 
                className="px-3 py-1.5 text-sm font-medium bg-hero-fg/10 text-hero-fg border-hero-fg/20 backdrop-blur-sm"
                role="listitem"
              >
                {i18n.language === 'en' ? '✓ Works Offline' : '✓ Hors Ligne'}
              </Badge>
              <Badge 
                variant="secondary" 
                className="px-3 py-1.5 text-sm font-medium bg-hero-fg/10 text-hero-fg border-hero-fg/20 backdrop-blur-sm"
                role="listitem"
              >
                {i18n.language === 'en' ? '✓ English & French' : '✓ Anglais et Français'}
              </Badge>
              <Badge 
                variant="secondary" 
                className="px-3 py-1.5 text-sm font-medium bg-hero-fg/10 text-hero-fg border-hero-fg/20 backdrop-blur-sm"
                role="listitem"
              >
                {i18n.language === 'en' ? '✓ Privacy First' : '✓ Vie Privée d\'Abord'}
              </Badge>
            </div>
            
            {/* Trial footnote */}
            <p className="text-xs text-hero-fg/70 pt-2 max-w-md">
              {t('trial_footnote')}
            </p>
          </div>

          {/* Right: CSS Phone Frame */}
          <div className="relative animate-scale-in">
            <div className="relative mx-auto w-full max-w-sm aspect-[9/19] bg-hero-fg/5 rounded-3xl border-4 border-hero-fg/10 shadow-2xl overflow-hidden p-6 flex items-center justify-center backdrop-blur-sm">
              <svg 
                className="w-full h-auto opacity-20"
                viewBox="0 0 200 400" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-hidden="true"
              >
                <rect x="20" y="80" width="160" height="60" rx="8" fill="currentColor" className="text-hero-fg" opacity="0.3"/>
                <rect x="20" y="160" width="160" height="60" rx="8" fill="currentColor" className="text-hero-fg" opacity="0.3"/>
                <rect x="20" y="240" width="160" height="60" rx="8" fill="currentColor" className="text-hero-fg" opacity="0.3"/>
                <circle cx="100" cy="340" r="30" fill="currentColor" className="text-hero-fg" opacity="0.4"/>
              </svg>
            </div>
            {/* Decorative gradient blur */}
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
};
