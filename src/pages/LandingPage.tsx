// @stride/landing-page v1 — Production-ready marketing page
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SEOHead } from '@/components/SEOHead';
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
import { CTASection } from '@/components/landing/CTASection';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  // Set page lang attribute
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const handleInstall = () => {
    // Always navigate to /app with UTM preservation
    navigate('/app?source=landing_cta');
  };

  const handleOpenApp = () => {
    // Direct navigation to app with UTM tracking
    navigate('/app?source=header_cta');
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
      <SEOHead
        title="StrideGuide - AI Vision Assistant for Blind & Low Vision Users | Free Offline Navigation"
        description="Free offline AI seeing-eye assistant for blind, low vision, and senior users in Canada. Real-time obstacle detection, voice guidance, and emergency SOS. Works without internet. English & French."
        canonical="https://strideguide.cam/"
      />
      <LandingHeader onSignIn={handleSignIn} onOpenApp={handleOpenApp} />
      
      <main id="main-content">
        <LandingHero onInstall={handleInstall} onSeePremium={handleSeePremium} />
        <ValuePillars />
        <Showcase />
        <WhyStrideGuide />
        <InstallGuide />
        <div id="pricing">
          <PricingSection onInstall={handleInstall} onUpgrade={handleUpgrade} />
        </div>
        <Testimonials />
        <FAQ />
        <CTASection onInstall={handleInstall} />
        
        {/* SEO Content Section - Hidden from visual users but readable by search engines */}
        <section className="sr-only" aria-hidden="true">
          <h2>About StrideGuide - Vision Guidance for Blind and Low Vision Users</h2>
          <p>
            StrideGuide is a free, offline-first vision assistant designed specifically for blind, 
            low vision, and senior users across Canada, the United States, and Europe. Our assistive technology 
            app provides real-time obstacle detection, voice-guided navigation, emergency SOS features, and a 
            lost item finder - all working completely offline without requiring internet connectivity.
          </p>
          <h3>Key Features for Visually Impaired Users</h3>
          <ul>
            <li>Real-time obstacle detection with advanced computer vision</li>
            <li>Voice navigation guidance in English and French</li>
            <li>Emergency SOS with automatic location sharing</li>
            <li>Lost item finder using on-device machine learning</li>
            <li>Fall detection with automatic emergency contact notification</li>
            <li>100% offline functionality - no internet required</li>
            <li>Complete privacy - camera data never leaves your device</li>
            <li>Screen reader compatible (VoiceOver, TalkBack)</li>
            <li>WCAG 2.2 AA accessibility compliant</li>
          </ul>
          <h3>Who Benefits from StrideGuide?</h3>
          <p>
            StrideGuide serves blind users, low vision individuals, seniors with vision impairment, 
            accessibility users needing navigation assistance, and anyone requiring assistive technology 
            for independent mobility. Our app is particularly valuable for seniors without data plans, 
            as it works entirely offline without consuming mobile data.
          </p>
          <h3>Privacy and Security</h3>
          <p>
            Unlike other navigation apps, StrideGuide processes all vision detection on your device. 
            Your camera footage is never uploaded to cloud servers, ensuring complete privacy and PIPEDA 
            compliance for Canadian users. All personal data is encrypted and stored locally on your device.
          </p>
        </section>
      </main>

      <LandingFooter onOpenApp={handleOpenApp} />
    </div>
  );
};

export default LandingPage;
