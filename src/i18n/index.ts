// @stride/i18n v2 – idempotent
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English resources
import enCommon from './locales/en/common.json';
import enHome from './locales/en/home.json';

// French resources  
import frCommon from './locales/fr/common.json';
import frHome from './locales/fr/home.json';

const resources = {
  en: {
    common: enCommon,
    home: enHome
  },
  fr: {
    common: frCommon,
    home: frHome
  }
};

const isProduction = process.env.NODE_ENV === 'production';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    ns: ['common', 'home'],
    defaultNS: 'common',
    returnNull: false,
    saveMissing: !isProduction,
    interpolation: {
      escapeValue: false // React already escapes values
    },
    react: {
      useSuspense: false
    }
  });

// Export ready Promise that resolves after resources load
export const ready = new Promise<void>((resolve) => {
  if (i18n.isInitialized) {
    resolve();
  } else {
    i18n.on('initialized', () => {
      resolve();
    });
  }
});

export default i18n;