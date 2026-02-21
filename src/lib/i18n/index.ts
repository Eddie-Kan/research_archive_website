export {
  locales,
  defaultLocale,
  localeNames,
  LOCALE_STORAGE_KEY,
  isValidLocale,
  getFallbackLocale,
} from './config';
export type { Locale } from './config';

export { I18nProvider, useI18n, BilingualText } from './provider';
