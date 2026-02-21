'use client';
import Link from 'next/link';
import { useI18n, snakeToCamel } from '@/lib/i18n/provider';
import { Search as SearchIcon } from 'lucide-react';

interface SearchHit {
  id: string;
  type: string;
  title_en: string;
  title_zh: string;
  summary_en: string;
  summary_zh: string;
  snippet?: string;
  score?: number;
}

interface Props {
  results: SearchHit[];
  loading: boolean;
  locale: string;
  query?: string;
  total?: number;
}

const TYPE_PATH_MAP: Record<string, string> = {
  project: 'projects',
  publication: 'publications',
  experiment: 'experiments',
  dataset: 'datasets',
  model: 'models',
  note: 'notes',
  idea: 'ideas',
};

function highlightQuery(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-inherit rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function SearchResults({ results, loading, locale, query = '', total }: Props) {
  const { t, localize } = useI18n();

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-5 w-2/3 bg-surface-2 rounded animate-pulse" />
            <div className="h-4 w-full bg-surface-2 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-surface-2 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0 && query) {
    return (
      <div className="text-center py-12">
        <SearchIcon size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">{t('search.noResults')}</p>
        <p className="text-xs text-gray-400 mt-1">
          {t('search.tryDifferentQuery')}
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 mb-4">
        {total} {t('common.results')} {t('search.forQuery')} &ldquo;{query}&rdquo;
      </p>

      <ul className="space-y-3">
        {results.map(hit => {
          const title = localize({ en: hit.title_en, 'zh-Hans': hit.title_zh });
          const summary = localize({ en: hit.summary_en, 'zh-Hans': hit.summary_zh });
          const typePath = TYPE_PATH_MAP[hit.type] || 'projects';
          const displayText = hit.snippet || summary.text;

          return (
            <li key={hit.id}>
              <Link
                href={`/${locale}/${typePath}/${hit.id}`}
                className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-gray-500 font-mono">
                    {t(`entity.${snakeToCamel(hit.type)}`)}
                  </span>
                  <h3 className="text-sm font-medium text-brand-600 dark:text-brand-400">
                    {highlightQuery(title.text, query)}
                  </h3>
                  {hit.score != null && (
                    <span className="ml-auto text-xs text-gray-400">
                      {(hit.score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                {displayText && (
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {highlightQuery(displayText, query)}
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
