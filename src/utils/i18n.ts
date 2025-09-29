import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslations from '@/i18n/en.json';
import frTranslations from '@/i18n/fr.json';

const resources = {
  en: {
    translation: enTranslations
  },
  fr: {
    translation: frTranslations
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    },
    react: {
      useSuspense: false // Avoid suspense in this setup
    }
  });

// Safe lookup with human fallback
export function t(key: string, params: Record<string, any> = {}, fallback = "") {
  const dict = resources[i18n.language as keyof typeof resources]?.translation || resources.en.translation;
  let s = (dict as any)[key] || fallback;
  
  // Simple token replace: {n}, {total}, {time}, {lang}
  if (s && params) {
    Object.keys(params).forEach(k => {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
    });
  }
  
  return s || `[${key}]`; // last-resort visible bracketed key
}

// Dev-only leak detector
export function assertHumanizedCopy(root = document.body) {
  if (process?.env?.NODE_ENV === "production") return;
  const bad: string[] = [];
  const isKey = (txt: string) => /\b[a-z0-9]+(\.[a-z0-9_]+)+\b/i.test(txt);
  (function walk(n: Node): void {
    if (n.nodeType === Node.TEXT_NODE) {
      const s = n.textContent?.trim();
      if (s && isKey(s)) bad.push(s);
    }
    n.childNodes.forEach(walk);
  })(root);
  if (bad.length) console.warn("[i18n] Unresolved keys:", [...new Set(bad)]);
}

export default i18n;