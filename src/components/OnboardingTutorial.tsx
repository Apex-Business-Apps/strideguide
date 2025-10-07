import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Volume2, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react';
import { AudioArmer } from '@/utils/AudioArmer';
import { useTranslation } from 'react-i18next';

interface OnboardingTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ onComplete, onSkip }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    {
      titleKey: "onboarding.welcome.title",
      contentKey: "onboarding.welcome.content",
      audio: "welcome-intro",
      action: "tap-to-continue"
    },
    {
      titleKey: "onboarding.perms.title",
      contentKey: "onboarding.perms.content",
      audio: "permissions-request",
      action: "enable-permissions"
    },
    {
      titleKey: "onboarding.start.title",
      contentKey: "onboarding.start.content",
      audio: "guidance-controls",
      action: "demo-start-stop"
    },
    {
      titleKey: "onboarding.finder.title",
      contentKey: "onboarding.finder.content",
      audio: "item-finder-demo",
      action: "demo-finder"
    },
    {
      titleKey: "onboarding.sos.title",
      contentKey: "onboarding.sos.content",
      audio: "emergency-demo",
      action: "demo-sos"
    },
    {
      titleKey: "onboarding.done.title",
      contentKey: "onboarding.done.content",
      audio: "tutorial-complete",
      action: "finish"
    }
  ];

  // Auto-play audio for first step
  useEffect(() => {
    if (currentStep === 0) {
      setTimeout(() => {
        playStepAudio(0);
      }, 500);
    }
  }, [currentStep]);

  const playStepAudio = async (stepIndex: number) => {
    try {
      if (!AudioArmer.isArmed()) {
        await AudioArmer.initialize();
      }
      
      // Play a gentle earcon to indicate step start
      AudioArmer.playEarcon('step-start');
      
      // Announce the step content
      const step = steps[stepIndex];
      const title = t(step.titleKey) || '';
      const content = t(step.contentKey) || '';
      const announcement = `${title}. ${content}`;
      
      setTimeout(() => {
        AudioArmer.announceText(announcement);
      }, 300);
      
    } catch (error) {
      console.warn('Audio playback failed:', error);
      // Fallback announcement for suspended context
      if (error instanceof Error && error.message.includes('suspended')) {
        AudioArmer.announceText(t("audio.tapToArm") || "Tap once to allow sound");
      }
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const skipTutorial = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    onSkip();
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* ARIA live region for step announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
        key={currentStep}
      >
        {t("onboarding.step", { n: currentStep + 1, total: steps.length })}
      </div>
      
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">
                {t("onboarding.step", { n: currentStep + 1, total: steps.length })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={skipTutorial}
                className="text-muted-foreground hover:text-foreground"
              >
                <SkipForward className="h-4 w-4 mr-1" />
                {t("onboarding.skip")}
              </Button>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step content */}
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold mb-3 text-foreground">
              {t(currentStepData.titleKey)}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t(currentStepData.contentKey)}
            </p>
          </div>

          {/* Audio control */}
          <div className="mb-6 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => playStepAudio(currentStep)}
              className="min-w-[140px]"
            >
              <Volume2 className="h-4 w-4 mr-2" />
              {t("onboarding.playAudio")}
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex justify-between gap-3">
            {currentStep > 0 ? (
              <Button variant="outline" onClick={prevStep} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t("onboarding.previous")}
              </Button>
            ) : (
              <div className="flex-1" />
            )}
            
            {currentStep < steps.length - 1 ? (
              <Button onClick={nextStep} className="flex-1">
                {t("onboarding.next")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={onComplete} className="flex-1">
                {t("onboarding.finish")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};