import React from "react";
import "../i18n/index";
import { useTranslation } from "react-i18next";
import AuthGate from "../components/AuthGate";
import PrimaryCTA from "../components/PrimaryCTA";
import DangerBtn from "../components/DangerBtn";

export default function Showcase() {
  const { t } = useTranslation();
  const [isAuthed] = React.useState(false);

  const SecBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = "", ...rest }) => (
    <button
      {...rest}
      className={
        "w-full rounded-2xl h-[52px] min-h-[52px] px-4 border border-neutral-600 bg-neutral-900 text-white " +
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-white " +
        "hover:bg-neutral-800 transition " + className
      }
    >
      {children}
    </button>
  );

  return (
    <main className="mx-auto max-w-5xl p-4 md:p-6 text-white">
      {/* Header with global CTA */}
      <header className="mb-4">
        <div className="flex items-center gap-3">
          <div aria-hidden className="w-8 h-8 rounded bg-indigo-600" />
          <h1 className="text-xl font-bold text-white">Stride Guide</h1>
          <div className="hidden md:block ml-auto w-[240px]">
            <PrimaryCTA onClick={() => {}}>
              {t("ctaPrimary")}
            </PrimaryCTA>
          </div>
        </div>
        <p className="mt-2 text-sm text-neutral-400">{t("tagline")}</p>
        <div className="md:hidden mt-3">
          <PrimaryCTA onClick={() => {}}>
            {t("ctaPrimary")}
          </PrimaryCTA>
        </div>
      </header>

      {/* "See the interface" with CTA-first structure */}
      <section aria-labelledby="see-int" className="bg-neutral-950 rounded-2xl p-5 md:p-8 border border-neutral-800">
        <h2 id="see-int" className="text-lg font-semibold mb-4">See the interface</h2>

        {/* PRIMARY CTA — first, full width */}
        <div className="mb-3">
          <PrimaryCTA onClick={() => { /* start guidance */ }}>
            {t("ctaPrimary")}
          </PrimaryCTA>
        </div>

        {/* Secondary actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <SecBtn>Find Item</SecBtn>
          <SecBtn>Settings</SecBtn>
        </div>

        {/* Auth gate */}
        <div className="mt-6">
          <AuthGate isAuthed={isAuthed} onSignIn={() => {}}>
            <div className="text-sm text-green-400">✓ Authenticated</div>
          </AuthGate>
        </div>

        {/* Danger zone — demoted visually and in order */}
        <div className="mt-4" role="region" aria-label="Danger actions">
          <DangerBtn>Emergency SOS</DangerBtn>
        </div>
      </section>

      {/* Feature cards */}
      <section className="grid md:grid-cols-2 gap-4 mt-6">
        <article className="rounded-2xl border border-neutral-800 p-4 bg-neutral-950">
          <h3 className="font-semibold">Guidance</h3>
          <p className="text-sm text-neutral-300 mt-1">Clear audio cues to navigate safely.</p>
        </article>
        <article className="rounded-2xl border border-neutral-800 p-4 bg-neutral-950">
          <h3 className="font-semibold">Find Item</h3>
          <p className="text-sm text-neutral-300 mt-1">Teach 12 frames to locate keys or wallet.</p>
        </article>
      </section>
    </main>
  );
}
