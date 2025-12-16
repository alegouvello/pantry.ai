import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import tr from "./locales/tr.json";

// Browser-default language selection (per requirement)
// - Detects from navigator + html tag
// - Caches in localStorage by default; we disable caching to keep it "browser default"

void i18n
  .use(
    new LanguageDetector(null, {
      order: ["navigator", "htmlTag"],
      caches: [],
    })
  )
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      es: { translation: es },
      tr: { translation: tr },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "fr", "es", "tr"],
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    returnNull: false,
  });

export default i18n;
