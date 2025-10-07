import i18next from "i18next";
import { initReactI18next } from "react-i18next";

// Bundle translation files at build time
import enCommon from "./locales/en/common.json";
import frCommon from "./locales/fr/common.json";
import enLandingAll from "../i18n/landing-en.json";

const enLanding = (enLandingAll as any).landing || {};

const resources = {
  en: { common: enCommon, landing: enLanding, features: {} },
  fr: { common: frCommon, landing: {}, features: {} },
};

export const i18nReady = i18next
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    ns: ["common", "landing", "features"],
    defaultNS: "common",
    keySeparator: ".",
    nsSeparator: ":",
    debug: true,
    interpolation: { escapeValue: false },
    react: { useSuspense: true },
  });

export default i18next;
