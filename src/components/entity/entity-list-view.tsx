'use client';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/provider';
import type { EntityListItem, ListFilters, PaginatedResult } from '@/domain/types';
import { useState } from 'react';
import { List, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  data: PaginatedResult<EntityListItem> | null;
  loading: boolean;
  filters: ListFilters;
  onFilterChange: (f: ListFilters) => void;
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

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[status] || colors.active}`}>
      {t(`status.${status}`)}
    </span>
  );
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  const { t } = useI18n();
  const colors: Record<string, string> = {
    public: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    unlisted: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    private: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[visibility] || ''}`}>
      {t(`visibility.${visibility}`)}
    </span>
  );
}

export function EntityListView({ data, loading, filters, onFilterChange }: Props) {
  const { locale, t, localize } = useI18n();
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-surface-2 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-8 text-center">
        {t('common.noResults')}
      </p>
    );
  }

  const getEntityPath = (item: EntityListItem) => {
    const typePath = TYPE_PATH_MAP[item.type] || 'projects';
    return `/${locale}/${typePath}/${item.id}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {data.total} {t('common.results')}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-surface-2' : ''}`}
            aria-label="Table view"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`p-1.5 rounded ${viewMode === 'card' ? 'bg-surface-2' : ''}`}
            aria-label="Card view"
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-1">
                <th className="text-left p-3 font-medium">{t('common.title')}</th>
                <th className="text-left p-3 font-medium w-24">{t('common.status')}</th>
                <th className="text-left p-3 font-medium w-24">{t('common.visibility')}</th>
                <th className="text-left p-3 font-medium w-32">{t('common.updatedAt')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(item => {
                const title = localize({ en: item.title_en, 'zh-Hans': item.title_zh });
                return (
                  <tr
                    key={item.id}
                    className="border-t border-gray-100 dark:border-gray-800 hover:bg-surface-1 transition-colors"
                  >
                    <td className="p-3">
                      <Link
                        href={getEntityPath(item)}
                        className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
                      >
                        {title.text}
                        {title.isFallback && (
                          <span className="ml-1 text-xs text-amber-500">
                            {t('common.fallbackIndicator')}
                          </span>
                        )}
                      </Link>
                      {item.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {item.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-gray-500"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="p-3">
                      <VisibilityBadge visibility={item.visibility} />
                    </td>
                    <td className="p-3 text-gray-500 text-xs">
                      {item.updated_at?.split('T')[0]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.items.map(item => {
            const title = localize({ en: item.title_en, 'zh-Hans': item.title_zh });
            const summary = localize({ en: item.summary_en, 'zh-Hans': item.summary_zh });
            return (
              <Link
                key={item.id}
                href={getEntityPath(item)}
                className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-sm">{title.text}</h3>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{summary.text}</p>
                <div className="flex gap-1 mt-2">
                  {item.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-gray-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => onFilterChange({ ...filters, page: (filters.page || 1) - 1 })}
            disabled={(filters.page || 1) <= 1}
            className="p-2 rounded hover:bg-surface-2 disabled:opacity-30"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-500">
            {t('common.page')} {filters.page || 1} {t('common.of')} {data.totalPages}
          </span>
          <button
            onClick={() => onFilterChange({ ...filters, page: (filters.page || 1) + 1 })}
            disabled={(filters.page || 1) >= data.totalPages}
            className="p-2 rounded hover:bg-surface-2 disabled:opacity-30"
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export { StatusBadge, VisibilityBadge };
