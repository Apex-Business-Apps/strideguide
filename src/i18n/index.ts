import i18next from "i18next";
import { initReactI18next } from "react-i18next";

// Bundle ALL translation files at build time
import enCommon from "./locales/en/common.json";
import frCommon from "./locales/fr/common.json";
import enHome from "./locales/en/home.json";
import frHome from "./locales/fr/home.json";
import enLegacy from "./en.json";
import frLegacy from "./fr.json";

// Merge legacy flat keys with new namespaced structure
const resources = {
  en: { 
    common: enCommon,
    home: enHome,
    translation: enLegacy // Legacy support
  },
  fr: { 
    common: frCommon,
    home: frHome,
    translation: frLegacy // Legacy support
  },
};

// Initialize i18n ONCE
export const i18nReady = i18next
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    ns: ["common", "home", "translation"],
    defaultNS: "common",
    keySeparator: ".",
    nsSeparator: ":",
    debug: false, // Disable debug in production
    interpolation: { escapeValue: false },
    react: { 
      useSuspense: false // Prevent blocking during init
    },
  });

// Dev-only key leak detector
export function assertNoKeyLeak(root = document.body) {
  if (typeof window === 'undefined' || !window.location.hostname.includes('localhost')) return;
  
  const leaked: string[] = [];
  const keyPattern = /\b[a-z]+\.(hero|home|plan|badge|app|pricing|auth|common|landing)\.[a-z_]+\b/i;
  
  function walk(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim() || '';
      if (text && keyPattern.test(text)) {
        leaked.push(text);
      }
    }
    node.childNodes.forEach(walk);
  }
  
  walk(root);
  
  if (leaked.length > 0) {
    console.error('[i18n] ❌ LEAKED KEYS DETECTED:', [...new Set(leaked)]);
    return false;
  }
  
  console.log('[i18n] ✓ No key leaks detected');
  return true;
}

export default i18next;
