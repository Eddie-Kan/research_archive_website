'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useTransition,
} from 'react';
import type { Locale } from './config';
import { defaultLocale, LOCALE_STORAGE_KEY, getFallbackLocale } from './config';

// Type for the dictionary
type Dictionary = Record<string, any>;

// Load dictionary dynamically
async function loadDictionary(locale: Locale): Promise<Dictionary> {
  switch (locale) {
    case 'zh-Hans':
      return (await import('./dictionaries/zh-Hans.json')).default;
    default:
      return (await import('./dictionaries/en.json')).default;
  }
}

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string>) => string;
  isLoading: boolean;
  // For bilingual content fields
  localize: <T extends { en: string; 'zh-Hans': string }>(
    field: T
  ) => { text: string; isFallback: boolean };
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({
  children,
  initialLocale,
  initialDictionary,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialDictionary: Dictionary;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [dictionary, setDictionary] = useState<Dictionary>(initialDictionary);
  const [isPending, startTransition] = useTransition();

  // Persist locale preference
  useEffect(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale === 'zh-Hans' ? 'zh-Hans' : 'en';
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    startTransition(async () => {
      const dict = await loadDictionary(newLocale);
      setDictionary(dict);
      setLocaleState(newLocale);
    });
  }, []);

  // Nested key lookup: t('nav.home') -> dictionary.nav.home
  // Missing keys: dev/test → ⟦MISSING: key⟧ + console.error; prod → English fallback + console.warn
  const t = useCallback(
    (key: string, params?: Record<string, string>): string => {
      const keys = key.split('.');
      let value: any = dictionary;

      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) {
          if (process.env.NODE_ENV === 'production') {
            console.warn(`[i18n] Missing translation key: "${key}"`);
          } else {
            console.error(`[i18n] Missing translation key: "${key}"`);
            return `⟦MISSING: ${key}⟧`;
          }
          return key;
        }
      }

      if (typeof value !== 'string') {
        if (process.env.NODE_ENV !== 'production') {
          console.error(`[i18n] Key "${key}" resolved to non-string value`);
          return `⟦MISSING: ${key}⟧`;
        }
        return key;
      }

      if (params) {
        return value.replace(
          /\{\{(\w+)\}\}/g,
          (_, k) => params[k] || `{{${k}}}`
        );
      }

      return value;
    },
    [dictionary]
  );

  // Localize a bilingual field, with fallback
  const localize = useCallback(
    <T extends { en: string; 'zh-Hans': string }>(
      field: T
    ): { text: string; isFallback: boolean } => {
      const primary = locale === 'zh-Hans' ? field['zh-Hans'] : field.en;
      if (primary && primary.trim()) return { text: primary, isFallback: false };

      const fallbackLocale = getFallbackLocale(locale);
      const fallback =
        fallbackLocale === 'zh-Hans' ? field['zh-Hans'] : field.en;
      return { text: fallback || '', isFallback: true };
    },
    [locale]
  );

  return (
    <I18nContext.Provider
      value={{ locale, setLocale, t, isLoading: isPending, localize }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

// Convert snake_case DB identifiers (e.g. "material_system") to camelCase dictionary keys ("materialSystem")
export function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// Helper component for bilingual text with fallback indicator
export function BilingualText({
  field,
  className,
}: {
  field: { en: string; 'zh-Hans': string };
  className?: string;
}) {
  const { localize, t } = useI18n();
  const { text, isFallback } = localize(field);

  return (
    <span className={className}>
      {text}
      {isFallback && (
        <span
          className="ml-1 text-xs text-amber-500 dark:text-amber-400"
          title={t('common.translationMissing')}
        >
          {t('common.fallbackIndicator')}
        </span>
      )}
    </span>
  );
}
