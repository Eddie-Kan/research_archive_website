'use client';

import { useState } from 'react';
import { useSearch } from '@/domain/hooks';
import { useI18n } from '@/lib/i18n/provider';
import { SearchResults } from '@/components/entity/search-results';

export default function SearchPage() {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const { data, loading } = useSearch(query, typeFilter ? { type: typeFilter } : {});

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">{t('nav.search')}</h1>
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('search.placeholder')}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-surface-1 focus:ring-2 focus:ring-brand-500 focus:border-transparent text-base"
          autoFocus
          aria-label={t('search.placeholder')}
        />
      </div>

      <SearchResults results={data?.items || []} loading={loading} locale={locale} query={query} total={data?.total} />
    </div>
  );
}
