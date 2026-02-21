'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/provider';
import { TYPE_PATH_MAP } from '@/lib/entity-types';
import { Search, X } from 'lucide-react';

interface CommandResult {
  id: string;
  type: string;
  title_en: string;
  title_zh: string;
  summary_en: string;
  summary_zh: string;
}

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommandResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { locale, t, localize } = useI18n();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?query=${encodeURIComponent(query)}&limit=8`);
        const data = await res.json();
        setResults(data.items || []);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const navigate = (result: CommandResult) => {
    const typePath = TYPE_PATH_MAP[result.type] || 'projects';
    router.push(`/${locale}/${typePath}/${result.id}`);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && results[selectedIndex]) {
      navigate(results[selectedIndex]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-lg bg-surface-0 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search size={16} className="text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('search.placeholder')}
            className="flex-1 bg-transparent outline-none text-sm"
            aria-label="Search"
          />
          <button onClick={onClose} className="p-1 hover:bg-surface-2 rounded" aria-label={t('common.close')}>
            <X size={14} />
          </button>
        </div>

        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto py-2" role="listbox">
            {results.map((r, i) => {
              const { text: title } = localize({
                en: r.title_en,
                'zh-Hans': r.title_zh,
              });
              return (
                <li
                  key={r.id}
                  role="option"
                  aria-selected={i === selectedIndex}
                  className={`px-4 py-2 cursor-pointer flex items-center gap-3 text-sm ${
                    i === selectedIndex
                      ? 'bg-brand-50 dark:bg-brand-950'
                      : 'hover:bg-surface-1'
                  }`}
                  onClick={() => navigate(r)}
                >
                  <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-gray-500 font-mono">
                    {r.type}
                  </span>
                  <span className="truncate">{title}</span>
                </li>
              );
            })}
          </ul>
        )}

        {query && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            {t('common.noResults')}
          </div>
        )}
      </div>
    </div>
  );
}
