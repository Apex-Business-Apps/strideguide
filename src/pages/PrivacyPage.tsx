import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';

export default function PrivacyPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isEnglish = i18n.language === 'en';

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Privacy Policy - StrideGuide | PIPEDA Compliant Vision Assistant"
        description="StrideGuide privacy policy. 100% offline, no camera images leave your device, no location tracking. PIPEDA compliant privacy for Canadian blind and low vision users."
        canonical="https://strideguide.cam/privacy"
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {isEnglish ? 'Back to Home' : 'Retour à l\'accueil'}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">
              {isEnglish ? 'Privacy Policy' : 'Politique de confidentialité'}
            </CardTitle>
            <CardDescription>
              {isEnglish ? 'Last updated: January 2025' : 'Dernière mise à jour : janvier 2025'}
            </CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            {isEnglish ? (
              <>
                <section>
                  <h2 className="text-xl font-semibold mb-3">Our Privacy Commitment</h2>
                  <p className="text-muted-foreground">
                    StrideGuide is designed with privacy first. Your safety and trust are our top priorities.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">What We Don't Collect</h2>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>No camera images leave your device</strong> — All vision processing happens locally using on-device ML models</li>
                    <li><strong>No location tracking</strong> — We don't track where you go or when</li>
                    <li><strong>No third-party analytics</strong> — We don't share your data with advertisers or data brokers</li>
                    <li><strong>No mandatory cloud services</strong> — Core features work 100% offline</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">What We Collect (Opt-in Only)</h2>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Crash reports</strong> — Anonymous technical diagnostics to improve stability (opt-in)</li>
                    <li><strong>Usage metrics</strong> — Aggregated feature usage to prioritize improvements (opt-in)</li>
                    <li><strong>Emergency contacts</strong> — Stored locally on your device for SOS features</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Your Data Rights (PIPEDA)</h2>
                  <p className="text-muted-foreground mb-3">
                    Under Canadian privacy law (PIPEDA), you have the right to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Access any data we hold about you</li>
                    <li>Request deletion of your data</li>
                    <li>Withdraw consent at any time</li>
                    <li>File a complaint with the Privacy Commissioner of Canada</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Data Security</h2>
                  <p className="text-muted-foreground">
                    Emergency contact information is encrypted locally using industry-standard cryptography. 
                    ML models and audio guidance data are cached offline for privacy and reliability.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
                  <p className="text-muted-foreground">
                    For privacy questions or data requests, contact us at{' '}
                    <a href="mailto:privacy@strideguide.cam" className="text-primary hover:underline">
                      privacy@strideguide.cam
                    </a>
                  </p>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h2 className="text-xl font-semibold mb-3">Notre engagement en matière de confidentialité</h2>
                  <p className="text-muted-foreground">
                    StrideGuide est conçu avec la confidentialité en priorité. Votre sécurité et votre confiance sont nos priorités absolues.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Ce que nous ne collectons pas</h2>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Aucune image de caméra ne quitte votre appareil</strong> — Tout le traitement visuel se fait localement à l'aide de modèles ML sur l'appareil</li>
                    <li><strong>Aucun suivi de localisation</strong> — Nous ne suivons ni où vous allez ni quand</li>
                    <li><strong>Aucune analyse tierce</strong> — Nous ne partageons pas vos données avec des annonceurs ou des courtiers de données</li>
                    <li><strong>Aucun service cloud obligatoire</strong> — Les fonctionnalités principales fonctionnent 100% hors ligne</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Ce que nous collectons (opt-in uniquement)</h2>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Rapports de plantage</strong> — Diagnostics techniques anonymes pour améliorer la stabilité (opt-in)</li>
                    <li><strong>Métriques d'utilisation</strong> — Utilisation agrégée des fonctionnalités pour prioriser les améliorations (opt-in)</li>
                    <li><strong>Contacts d'urgence</strong> — Stockés localement sur votre appareil pour les fonctionnalités SOS</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Vos droits sur les données (LPRPDE)</h2>
                  <p className="text-muted-foreground mb-3">
                    En vertu de la loi canadienne sur la protection de la vie privée (LPRPDE), vous avez le droit de :
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Accéder à toutes les données que nous détenons à votre sujet</li>
                    <li>Demander la suppression de vos données</li>
                    <li>Retirer votre consentement à tout moment</li>
                    <li>Déposer une plainte auprès du Commissaire à la protection de la vie privée du Canada</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Sécurité des données</h2>
                  <p className="text-muted-foreground">
                    Les informations de contact d'urgence sont cryptées localement à l'aide de la cryptographie standard de l'industrie. 
                    Les modèles ML et les données d'orientation audio sont mis en cache hors ligne pour la confidentialité et la fiabilité.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Nous contacter</h2>
                  <p className="text-muted-foreground">
                    Pour toute question concernant la confidentialité ou demande de données, contactez-nous à{' '}
                    <a href="mailto:privacy@strideguide.cam" className="text-primary hover:underline">
                      privacy@strideguide.cam
                    </a>
                  </p>
                </section>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
