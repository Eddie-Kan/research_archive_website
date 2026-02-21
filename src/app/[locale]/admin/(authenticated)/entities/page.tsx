'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n/provider';
import { Plus, Trash2 } from 'lucide-react';
import { useResizableColumns } from '@/hooks/useResizableColumns';

interface EntityRow {
  id: string;
  type: string;
  title_en: string | null;
  title_zh: string | null;
  status: string;
  visibility: string;
  updated_at: string;
}

const ENTITY_TYPES = [
  '', 'project', 'publication', 'experiment', 'dataset', 'model', 'repo', 'note',
  'lit_review', 'meeting', 'idea', 'skill', 'method', 'material_system',
  'metric', 'collaborator', 'institution', 'media',
];

export default function EntitiesListPage() {
  const { t, locale } = useI18n();
  const params = useParams();
  const searchParams = useSearchParams();
  const loc = params.locale as string;
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { widths, onMouseDown } = useResizableColumns([280, 120, 90, 90, 110, 40]);

  const fetchEntities = () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: '30' });
    if (typeFilter) qs.set('type', typeFilter);
    if (search) qs.set('search', search);

    fetch(`/api/admin/entities?${qs}`)
      .then(r => r.json())
      .then(data => {
        setEntities(data.items || data.data || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchEntities(); }, [page, typeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEntities();
  };

  const handleDelete = async (id: string, type: string) => {
    if (!confirm(t('admin.entities.confirmDelete'))) return;
    const res = await fetch(`/api/admin/entities/${id}`, { method: 'DELETE', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    if (res.ok) fetchEntities();
  };

  const displayTitle = (e: EntityRow) =>
    (locale === 'zh-Hans' ? e.title_zh || e.title_en : e.title_en || e.title_zh) || e.id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('admin.nav.entities')}</h1>
        <Link
          href={`/${loc}/admin/entities/new`}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          {t('admin.entities.create')}
        </Link>
      </div>

      <div className="flex gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button type="submit" className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700">
            {t('common.search')}
          </button>
        </form>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
        >
          {ENTITY_TYPES.map(t => (
            <option key={t} value={t}>{t || 'All types'}</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <table className="text-sm" style={{ tableLayout: 'fixed', width: widths.reduce((a, b) => a + b, 0) }}>
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              {[t('common.title'), 'Type', t('common.status'), t('common.visibility'), t('common.updatedAt'), ''].map((label, i) => (
                <th key={i} className="text-left px-4 py-2 font-medium relative" style={{ width: widths[i] }}>
                  {label}
                  {i < widths.length - 1 && (
                    <span
                      onMouseDown={e => onMouseDown(i, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-brand-400/40"
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{t('common.loading')}</td></tr>
            ) : entities.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{t('common.noResults')}</td></tr>
            ) : entities.map(e => (
              <tr key={e.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                <td className="px-4 py-2 break-words">
                  <Link href={`/${loc}/admin/entities/${e.id}`} className="text-brand-600 hover:underline">
                    {displayTitle(e)}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-500 break-words">{e.type}</td>
                <td className="px-4 py-2">
                  <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800">{e.status}</span>
                </td>
                <td className="px-4 py-2">
                  <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800">{e.visibility}</span>
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">{new Date(e.updated_at).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  <button onClick={() => handleDelete(e.id, e.type)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 30 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded text-sm bg-gray-100 dark:bg-gray-800 disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-gray-500">{t('common.page')} {page} {t('common.of')} {Math.ceil(total / 30)}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 30)}
            className="px-3 py-1 rounded text-sm bg-gray-100 dark:bg-gray-800 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
