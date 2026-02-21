'use client';
import { useI18n } from '@/lib/i18n/provider';
import type { ListFilters, SortField, SortOrder } from '@/domain/types';

interface Props {
  filters: ListFilters;
  onFilterChange: (f: ListFilters) => void;
}

const STATUS_OPTIONS = ['active', 'paused', 'completed', 'archived'] as const;
const VISIBILITY_OPTIONS = ['public', 'unlisted', 'private'] as const;
const SORT_OPTIONS: { value: SortField; labelKey: string }[] = [
  { value: 'updated_at', labelKey: 'filters.sortUpdated' },
  { value: 'created_at', labelKey: 'filters.sortCreated' },
  { value: 'title', labelKey: 'filters.sortTitle' },
];

export function FacetSidebar({ filters, onFilterChange }: Props) {
  const { t } = useI18n();

  const toggleFilter = (key: 'status' | 'visibility', value: string) => {
    const current = filters[key] || '';
    const values = current ? current.split(',') : [];
    const idx = values.indexOf(value);
    if (idx >= 0) {
      values.splice(idx, 1);
    } else {
      values.push(value);
    }
    onFilterChange({ ...filters, [key]: values.join(',') || undefined, page: 1 });
  };

  const isChecked = (key: 'status' | 'visibility', value: string) => {
    const current = filters[key] || '';
    return current.split(',').includes(value);
  };

  return (
    <aside className="w-56 flex-shrink-0 space-y-6 no-print" aria-label="Filters">
      {/* Status filter */}
      <fieldset>
        <legend className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          {t('filters.status')}
        </legend>
        <div className="space-y-1.5">
          {STATUS_OPTIONS.map(status => (
            <label key={status} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isChecked('status', status)}
                onChange={() => toggleFilter('status', status)}
                className="rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500"
              />
              <span className="capitalize">{t(`status.${status}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Visibility filter */}
      <fieldset>
        <legend className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          {t('filters.visibility')}
        </legend>
        <div className="space-y-1.5">
          {VISIBILITY_OPTIONS.map(vis => (
            <label key={vis} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isChecked('visibility', vis)}
                onChange={() => toggleFilter('visibility', vis)}
                className="rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500"
              />
              <span className="capitalize">{t(`visibility.${vis}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Sort */}
      <div>
        <label
          htmlFor="sort-select"
          className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2"
        >
          {t('filters.sortBy')}
        </label>
        <select
          id="sort-select"
          value={filters.sort || 'updated_at'}
          onChange={e =>
            onFilterChange({ ...filters, sort: e.target.value as SortField, page: 1 })
          }
          className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-surface-0 px-3 py-1.5 focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>

        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onFilterChange({ ...filters, order: 'asc' as SortOrder, page: 1 })}
            className={`flex-1 text-xs py-1 rounded ${
              filters.order === 'asc'
                ? 'bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300'
                : 'bg-surface-2 text-gray-500'
            }`}
          >
            {t('filters.ascending')}
          </button>
          <button
            onClick={() => onFilterChange({ ...filters, order: 'desc' as SortOrder, page: 1 })}
            className={`flex-1 text-xs py-1 rounded ${
              (filters.order || 'desc') === 'desc'
                ? 'bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300'
                : 'bg-surface-2 text-gray-500'
            }`}
          >
            {t('filters.descending')}
          </button>
        </div>
      </div>

      {/* Date range */}
      <div>
        <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          {t('filters.dateRange')}
        </span>
        <div className="space-y-2">
          <div>
            <label htmlFor="date-from" className="block text-xs text-gray-400 mb-0.5">
              {t('filters.from')}
            </label>
            <input
              id="date-from"
              type="date"
              value={filters.dateFrom || ''}
              onChange={e =>
                onFilterChange({ ...filters, dateFrom: e.target.value || undefined, page: 1 })
              }
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-surface-0 px-3 py-1.5 focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="date-to" className="block text-xs text-gray-400 mb-0.5">
              {t('filters.to')}
            </label>
            <input
              id="date-to"
              type="date"
              value={filters.dateTo || ''}
              onChange={e =>
                onFilterChange({ ...filters, dateTo: e.target.value || undefined, page: 1 })
              }
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-surface-0 px-3 py-1.5 focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Clear all */}
      <button
        onClick={() => onFilterChange({ page: 1, limit: filters.limit })}
        className="w-full text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 py-1.5 rounded-lg hover:bg-surface-2 transition-colors"
      >
        {t('filters.clearAll')}
      </button>
    </aside>
  );
}
