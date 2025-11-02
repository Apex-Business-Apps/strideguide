import React from 'react';
import { ArrowLeft, Shield, Wifi, Volume2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { SEOHead } from '@/components/SEOHead';

interface HelpPageProps {
  onBack: () => void;
}

const HelpPage: React.FC<HelpPageProps> = ({ onBack }) => {
  const { t } = useTranslation();

  const helpSections = [
    {
      icon: Shield,
      title: 'Your Privacy is Protected',
      description: 'All vision processing happens on your device. Camera images never leave your phone. No cloud uploads, no data tracking.',
      color: 'text-success'
    },
    {
      icon: Wifi,
      title: 'Works 100% Offline',
      description: 'Core features work without internet. Perfect for users without data plans or in areas with poor reception.',
      color: 'text-primary'
    },
    {
      icon: Volume2,
      title: 'Clear Audio Guidance',
      description: 'Voice directions and audio cues guide you safely. Works with headphones or phone speaker. Screen reader compatible.',
      color: 'text-accent'
    },
    {
      icon: Eye,
      title: 'Built for Accessibility',
      description: 'Large touch targets, high contrast, voice commands, and full VoiceOver/TalkBack support for blind and low vision users.',
      color: 'text-warning'
    }
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <SEOHead
        title="Help & Support - StrideGuide | Vision Assistant Guide"
        description="Get help with StrideGuide's offline vision assistance features. Learn about privacy, offline mode, audio guidance, and accessibility features for blind and low vision users."
        canonical="https://strideguide.cam/help"
      />
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="min-h-[44px] px-3"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Help & Support</h1>
        </div>

        {/* Help Sections */}
        <div className="space-y-4">
          {helpSections.map((section, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-3">
                  <section.icon className={`h-5 w-5 ${section.color}`} />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {section.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Tips */}
        <Card className="bg-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 shrink-0" />
                <p>Tap anywhere on the home screen to enable audio features</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 shrink-0" />
                <p>Hold Emergency SOS for 1.2 seconds to activate</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 shrink-0" />
                <p>Install as PWA for better performance and offline access</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 shrink-0" />
                <p>Use headphones for best spatial audio experience</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 text-center space-y-3">
            <h3 className="font-semibold">Need More Help?</h3>
            <p className="text-sm text-muted-foreground">
              Contact our support team for personalized assistance
            </p>
            <Button
              onClick={() => window.open('mailto:support@strideguide.ca')}
              variant="outline"
              className="min-h-[44px]"
            >
              Email Support
            </Button>
          </CardContent>
        </Card>

        {/* Version Info */}
        <div className="text-center text-xs text-muted-foreground pt-4">
          <p>StrideGuide PWA v1.0 • Built in Canada</p>
          <p>For seniors and vision-impaired users</p>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;