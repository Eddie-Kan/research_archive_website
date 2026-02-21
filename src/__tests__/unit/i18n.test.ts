import { describe, it, expect } from 'vitest';
import { isValidLocale, getFallbackLocale, defaultLocale } from '@/lib/i18n/config';

describe('i18n Configuration', () => {
  it('should validate correct locales', () => {
    expect(isValidLocale('en')).toBe(true);
    expect(isValidLocale('zh-Hans')).toBe(true);
  });

  it('should reject invalid locales', () => {
    expect(isValidLocale('fr')).toBe(false);
    expect(isValidLocale('zh-Hant')).toBe(false);
    expect(isValidLocale('')).toBe(false);
  });

  it('should return correct fallback locale', () => {
    expect(getFallbackLocale('en')).toBe('zh-Hans');
    expect(getFallbackLocale('zh-Hans')).toBe('en');
  });

  it('should have en as default locale', () => {
    expect(defaultLocale).toBe('en');
  });
});

describe('i18n Dictionaries', () => {
  it('should have matching keys in en and zh-Hans dictionaries', async () => {
    const en = (await import('@/lib/i18n/dictionaries/en.json')).default;
    const zh = (await import('@/lib/i18n/dictionaries/zh-Hans.json')).default;

    function getKeys(obj: any, prefix = ''): string[] {
      const keys: string[] = [];
      for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          keys.push(...getKeys(obj[key], fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    }

    const enKeys = getKeys(en).sort();
    const zhKeys = getKeys(zh).sort();

    // Every en key should exist in zh
    for (const key of enKeys) {
      expect(zhKeys).toContain(key);
    }
  });
});
