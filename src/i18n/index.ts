// @stride/i18n v1 — idempotent
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/common.json';
import fr from './locales/fr/common.json';

if (!(window as any).__STRIDE_I18N__) {
  i18n.use(initReactI18next).init({
    resources: { en: { common: en }, fr: { common: fr } },
    lng: 'en', fallbackLng: 'en',
    ns: ['common'], defaultNS: 'common',
    interpolation: { escapeValue: false },
    returnNull: false, returnEmptyString: false
  });
  (window as any).__STRIDE_I18N__ = true;
}
export default i18n;