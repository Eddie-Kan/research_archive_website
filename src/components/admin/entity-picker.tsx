'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { entityTypeLabel } from '@/lib/admin/label-helpers';
import { Search, X } from 'lucide-react';

interface EntityPickerProps {
  label: string;
  value: string;
  onChange: (id: string) => void;
  entityType?: string;
}

interface SearchResult {
  id: string;
  title_en: string | null;
  title_zh: string | null;
  type: string;
}

export function EntityPicker({ label, value, onChange, entityType }: EntityPickerProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [defaultResults, setDefaultResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [selectedEntity, setSelectedEntity] = useState<SearchResult | null>(null);
  const { t, locale } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const defaultsFetched = useRef(false);

  // Fetch default (recent) entities once for the browsable list
  useEffect(() => {
    if (defaultsFetched.current) return;
    defaultsFetched.current = true;

    const params = new URLSearchParams({ limit: '20', sort: 'updated_at', sortDir: 'desc' });
    if (entityType) params.set('type', entityType);

    fetch(`/api/admin/entities?${params}`)
      .then(r => r.json())
      .then(data => setDefaultResults(data.data || []))
      .catch(() => {});
  }, [entityType]);

  // If a value is set externally (e.g. initial load), resolve its display name
  useEffect(() => {
    if (!value || selectedEntity?.id === value) return;
    // Check if it's already in our cached results
    const found = [...defaultResults, ...results].find(r => r.id === value);
    if (found) {
      setSelectedEntity(found);
      return;
    }
    // Fetch by search to resolve the title
    fetch(`/api/admin/entities?search=${encodeURIComponent(value)}&limit=1`)
      .then(r => r.json())
      .then(data => {
        const match = (data.data || []).find((r: SearchResult) => r.id === value);
        if (match) setSelectedEntity(match);
      })
      .catch(() => {});
  }, [value, defaultResults, results, selectedEntity?.id]);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch search results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ search: debouncedQuery, limit: '15' });
    if (entityType) params.set('type', entityType);

    fetch(`/api/admin/entities?${params}`)
      .then(r => r.json())
      .then(data => {
        setResults(data.data || []);
        setHighlighted(-1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [debouncedQuery, entityType]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const displayTitle = useCallback((r: SearchResult) =>
    (locale === 'zh-Hans' ? r.title_zh || r.title_en : r.title_en || r.title_zh) || r.id,
  [locale]);

  const selectResult = useCallback((r: SearchResult) => {
    onChange(r.id);
    setSelectedEntity(r);
    setQuery('');
    setOpen(false);
  }, [onChange]);

  const clearSelection = useCallback(() => {
    onChange('');
    setSelectedEntity(null);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [onChange]);

  const handleFocus = () => {
    setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const visibleResults = activeResults;
    if (!open || visibleResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(prev => (prev + 1) % visibleResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(prev => (prev <= 0 ? visibleResults.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      selectResult(visibleResults[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Show search results if user is typing, otherwise show the default browsable list
  const activeResults = query.trim() ? results : defaultResults;
  const showDropdown = open && (activeResults.length > 0 || loading);

  // When an entity is selected, show a chip instead of the raw input
  if (selectedEntity && value === selectedEntity.id) {
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium">{label}</label>
        <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm min-h-[34px]">
          <span className="truncate flex-1">
            {displayTitle(selectedEntity)}
          </span>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {entityTypeLabel(selectedEntity.type, t)}
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
            aria-label={t('common.close')}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-1" ref={ref}>
      <label className="block text-sm font-medium">{label}</label>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={t('admin.form.entityPickerPlaceholder')}
          className="w-full pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
        />
      </div>
      {showDropdown && (
        <div
          className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
          role="listbox"
        >
          {loading && activeResults.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">{t('common.loading')}</div>
          ) : activeResults.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">{t('common.noResults')}</div>
          ) : (
            activeResults.map((r, i) => (
              <button
                key={r.id}
                type="button"
                role="option"
                aria-selected={i === highlighted}
                onClick={() => selectResult(r)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 ${
                  i === highlighted
                    ? 'bg-brand-50 dark:bg-brand-900/20'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="truncate">{displayTitle(r)}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{entityTypeLabel(r.type, t)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
