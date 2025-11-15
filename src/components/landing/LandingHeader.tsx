// @stride/landing-header v1
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Globe } from 'lucide-react';

interface LandingHeaderProps {
  onSignIn: () => void;
  onOpenApp: () => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({ onSignIn, onOpenApp }) => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(newLang);
    document.documentElement.lang = newLang;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80" aria-label="StrideGuide home">
            <Logo className="h-10 w-auto" />
            <span className="sr-only">StrideGuide</span>
          </a>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLanguage}
              className="w-10 h-10"
              aria-label={`Switch to ${i18n.language === 'en' ? 'French' : 'English'}`}
            >
              <Globe className="w-5 h-5" aria-hidden="true" />
            </Button>
            <Button
              onClick={onOpenApp}
              variant="secondary"
              size="lg"
              className="min-h-[44px] px-6 font-semibold hidden sm:flex"
              aria-label="Open App"
            >
              Open App
            </Button>
            <Button
              onClick={onSignIn}
              size="lg"
              className="min-h-[44px] px-6 font-semibold"
              aria-label={t('auth.signin')}
            >
              {t('auth.signin')}
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
};
