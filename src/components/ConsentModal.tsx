import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const CONSENT_KEY = 'stride_consent_v1';

export default function ConsentModal() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [telemetryConsent, setTelemetryConsent] = useState(false);
  const isEnglish = i18n.language === 'en';
  const location = useLocation();
  const skipConsent = location.pathname.startsWith('/auth') || location.pathname.startsWith('/privacy');

useEffect(() => {
  if (skipConsent) return;
  const hasConsented = localStorage.getItem(CONSENT_KEY);
  if (!hasConsented) {
    setOpen(true);
  }
}, [skipConsent]);

  const handleAccept = () => {
    const consent = {
      accepted: true,
      telemetry: telemetryConsent,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    setOpen(false);
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl">
            {isEnglish ? 'Welcome to StrideGuide' : 'Bienvenue sur StrideGuide'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 text-left">
            <p className="text-base">
              {isEnglish
                ? 'Your privacy matters. Here\'s how we protect it:'
                : 'Votre confidentialité compte. Voici comment nous la protégeons :'}
            </p>
            
            <ul className="space-y-2 text-sm list-disc pl-5">
              <li>
                {isEnglish
                  ? '🔒 No camera images leave your device — all vision processing is local'
                  : '🔒 Aucune image de caméra ne quitte votre appareil — tout le traitement visuel est local'}
              </li>
              <li>
                {isEnglish
                  ? '📴 Works 100% offline — no internet required for core features'
                  : '📴 Fonctionne 100% hors ligne — aucun Internet requis pour les fonctionnalités principales'}
              </li>
              <li>
                {isEnglish
                  ? '🚫 No location tracking or third-party analytics'
                  : '🚫 Aucun suivi de localisation ou analyse tierce'}
              </li>
            </ul>

            <div className="flex items-start space-x-3 pt-4 border-t">
              <Checkbox
                id="telemetry"
                checked={telemetryConsent}
                onCheckedChange={(checked) => setTelemetryConsent(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="telemetry" className="text-sm cursor-pointer">
                {isEnglish
                  ? 'Help us improve by sharing anonymous crash reports and usage metrics (optional)'
                  : 'Aidez-nous à améliorer en partageant des rapports de plantage anonymes et des métriques d\'utilisation (facultatif)'}
              </Label>
            </div>

            <p className="text-xs text-muted-foreground">
              {isEnglish ? (
                <>
                  By continuing, you agree to our{' '}
                  <a href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </a>
                  . You can change these settings anytime.
                </>
              ) : (
                <>
                  En continuant, vous acceptez notre{' '}
                  <a href="/privacy" className="text-primary hover:underline">
                    Politique de confidentialité
                  </a>
                  . Vous pouvez modifier ces paramètres à tout moment.
                </>
              )}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleAccept} className="min-h-[52px] w-full">
            {isEnglish ? 'I Understand — Continue' : 'Je comprends — Continuer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
