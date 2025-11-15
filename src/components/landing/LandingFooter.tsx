// @stride/landing-footer v1
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LandingFooterProps {
  onOpenApp?: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onOpenApp }) => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(newLang);
    document.documentElement.lang = newLang;
  };

  const links = [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Contact Support', href: 'mailto:support@strideguide.ca' },
    { label: 'Accessibility Statement', href: '/accessibility' },
  ];

  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
          {/* Brand */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-foreground">StrideGuide</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Navigate independently with real-time obstacle detection, voice guidance, and emergency features. Works completely offline.
            </p>
          </div>

          {/* Links */}
          <nav className="space-y-3" aria-label="Footer navigation">
            <h4 className="text-sm font-semibold text-foreground">Quick Links</h4>
            <ul className="space-y-2">
              {links.map((link, idx) => (
                <li key={idx}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Language & App */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Language</h4>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLanguage}
                className="gap-2 w-full sm:w-auto"
                aria-label={`Switch to ${i18n.language === 'en' ? 'French' : 'English'}`}
              >
                <Globe className="w-4 h-4" aria-hidden="true" />
                <span>{i18n.language === 'en' ? 'Français' : 'English'}</span>
              </Button>
              {onOpenApp && (
                <Button
                  onClick={onOpenApp}
                  size="sm"
                  className="w-full sm:w-auto"
                  aria-label="Open App"
                >
                  Open App
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            © 2025 StrideGuide. Built in Canada for blind, low vision, and senior users worldwide.
          </p>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {i18n.language === 'en' 
              ? 'Pricing may change. Trials convert to paid unless cancelled.' 
              : 'Les tarifs peuvent changer. L\'essai devient payant sauf annulation.'}
          </p>
        </div>
      </div>
    </footer>
  );
};
