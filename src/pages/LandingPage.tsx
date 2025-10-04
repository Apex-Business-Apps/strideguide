// @stride/landing-page v1 — Production-ready marketing page
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHero } from '@/components/landing/LandingHero';
import Showcase from '@/screens/Showcase';
import { ValuePillars } from '@/components/landing/ValuePillars';
import { WhyStrideGuide } from '@/components/landing/WhyStrideGuide';
import { PricingSection } from '@/components/landing/PricingSection';
import { InstallGuide } from '@/components/landing/InstallGuide';
import { Testimonials } from '@/components/landing/Testimonials';
import { FAQ } from '@/components/landing/FAQ';
import { LandingFooter } from '@/components/landing/LandingFooter';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  // Set page lang attribute
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const handleInstall = () => {
    // Check if PWA is installable
    const event = (window as any).deferredPrompt;
    if (event) {
      event.prompt();
      event.userChoice.then((choice: any) => {
        if (choice.outcome === 'accepted') {
          console.log('PWA installed');
        }
      });
    } else {
      // Fallback: Navigate to app
      navigate('/dashboard');
    }
  };

  const handleSeePremium = () => {
    // Scroll to pricing section
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSignIn = () => {
    navigate('/auth');
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader onSignIn={handleSignIn} />
      
      <main>
        <LandingHero onInstall={handleInstall} onSeePremium={handleSeePremium} />
        <Showcase />
        <ValuePillars />
        <WhyStrideGuide />
        <div id="pricing">
          <PricingSection onInstall={handleInstall} onUpgrade={handleUpgrade} />
        </div>
        <InstallGuide />
        <Testimonials />
        <FAQ />
      </main>

      <LandingFooter />
    </div>
  );
};

export default LandingPage;
