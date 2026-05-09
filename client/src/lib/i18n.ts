import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Traduzioni
import translationIT from '../locales/it.json';
import translationEN from '../locales/en.json';
import translationDE from '../locales/de.json';
import translationFR from '../locales/fr.json';
import translationES from '../locales/es.json';
import translationRU from '../locales/ru.json';
import translationNL from '../locales/nl.json';
import translationNO from '../locales/no.json';
import translationRO from '../locales/ro.json';
import translationHI from '../locales/hi.json';

// Risorse di traduzione
const resources = {
  it: {
    translation: translationIT,
  },
  en: {
    translation: translationEN,
  },
  de: {
    translation: translationDE,
  },
  fr: {
    translation: translationFR,
  },
  es: {
    translation: translationES,
  },
  ru: {
    translation: translationRU,
  },
  nl: {
    translation: translationNL,
  },
  no: {
    translation: translationNO,
  },
  ro: {
    translation: translationRO,
  },
  hi: {
    translation: translationHI,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'it',
    supportedLngs: ['it', 'en', 'de', 'fr', 'es', 'ru', 'nl', 'no', 'ro', 'hi'],
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;