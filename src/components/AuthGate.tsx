// @stride/auth-gate v1 — idempotent
import React from 'react';
import { useTranslation } from 'react-i18next';

export default function AuthGate() {
  const { t } = useTranslation();
  const signIn = () => { (window as any).auth?.signIn?.() ?? (location.href='/login'); };

  return (
    <section className="rounded-2xl border p-4 bg-white text-center">
      <div aria-hidden className="text-3xl mb-2">🔒</div>
      <h3 className="text-lg font-semibold">{t('auth.requiredTitle')}</h3>
      <p className="text-sm opacity-80 mb-3">{t('auth.requiredBody')}</p>
      <button
        onClick={signIn}
        className="w-full min-h-[52px] rounded-2xl bg-black text-white font-semibold
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 shadow-sm"
        aria-label={t('auth.signin')}
      >
        {t('auth.signin')}
      </button>
    </section>
  );
}
