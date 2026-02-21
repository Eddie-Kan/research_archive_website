'use client';
import { useI18n } from '@/lib/i18n/provider';
import { useTheme } from 'next-themes';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Sun, Moon, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CommandPalette } from './command-palette';

export function TopBar() {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [showCommand, setShowCommand] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommand(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleLocale = () => {
    const newLocale = locale === 'en' ? 'zh-Hans' : 'en';
    setLocale(newLocale);
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <>
      <header className="h-14 border-b border-gray-200 dark:border-gray-800 bg-surface-0 flex items-center justify-between px-4 no-print">
        <button
          onClick={() => setShowCommand(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-1 border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:border-gray-300 dark:hover:border-gray-600 transition-colors w-64"
          aria-label={t('accessibility.searchOpen')}
        >
          <Search size={14} />
          <span>{t('search.placeholder')}</span>
          <kbd className="ml-auto text-xs bg-surface-2 px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLocale}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface-2 text-sm transition-colors"
            aria-label={t('accessibility.toggleLanguage')}
          >
            <Globe size={14} />
            <span>{locale === 'en' ? '中文' : 'EN'}</span>
          </button>

          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-surface-2 transition-colors"
              aria-label={t('accessibility.toggleTheme')}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
        </div>
      </header>

      {showCommand && (
        <CommandPalette onClose={() => setShowCommand(false)} />
      )}
    </>
  );
}
