import { notFound } from 'next/navigation';
import { ThemeProvider } from 'next-themes';
import { I18nProvider } from '@/lib/i18n/provider';
import { isValidLocale, type Locale } from '@/lib/i18n/config';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';

async function getDictionary(locale: Locale) {
  switch (locale) {
    case 'zh-Hans':
      return (await import('@/lib/i18n/dictionaries/zh-Hans.json')).default;
    default:
      return (await import('@/lib/i18n/dictionaries/en.json')).default;
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  if (!isValidLocale(localeParam)) notFound();
  const locale = localeParam as Locale;
  const dictionary = await getDictionary(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-surface-0 text-gray-900 dark:text-gray-100 antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <I18nProvider initialLocale={locale} initialDictionary={dictionary}>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <div className="flex flex-1 flex-col overflow-hidden">
                <TopBar />
                <main className="flex-1 overflow-y-auto p-6">
                  {children}
                </main>
              </div>
            </div>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
