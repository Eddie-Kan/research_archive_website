export const locales = ['en', 'zh-Hans'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export const localeNames: Record<Locale, string> = {
  en: 'English',
  'zh-Hans': '简体中文',
};

// Cookie/localStorage key for persisted preference
export const LOCALE_STORAGE_KEY = 'ek-archive-locale';

// Check if a locale string is valid
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

// Get the fallback locale for a given locale
export function getFallbackLocale(locale: Locale): Locale {
  return locale === 'en' ? 'zh-Hans' : 'en';
}
