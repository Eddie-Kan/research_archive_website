'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { edgeTypeLabel } from '@/lib/admin/label-helpers';
import { EntityPicker } from '@/components/admin/entity-picker';
import { Plus, Trash2 } from 'lucide-react';
import { useResizableColumns } from '@/hooks/useResizableColumns';

interface EdgeData {
  id: string;
  from_id: string;
  to_id: string;
  edge_type: string;
  label_en?: string | null;
  label_zh?: string | null;
  weight?: number;
  created_at?: string;
}

interface EntityInfo {
  title_en: string | null;
  title_zh: string | null;
  type: string;
}

const EDGE_TYPES = [
  'project_contains', 'produced', 'evaluated_on', 'cites',
  'derived_from', 'implements', 'collaborates_with', 'related_to', 'supersedes',
];

export default function EdgesPage() {
  const { t, locale } = useI18n();
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [entityMap, setEntityMap] = useState<Record<string, EntityInfo>>({});
  const [loading, setLoading] = useState(true);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [edgeType, setEdgeType] = useState('related_to');
  const { widths, onMouseDown } = useResizableColumns([200, 130, 200, 150, 70, 100, 40]);

  const entityName = (id: string) => {
    const info = entityMap[id];
    if (!info) return id;
    const title = locale === 'zh-Hans' ? (info.title_zh || info.title_en) : (info.title_en || info.title_zh);
    return title || id;
  };

  const fetchEdges = () => {
    setLoading(true);
    fetch('/api/admin/edges')
      .then(r => r.json())
      .then(data => {
        setEdges(data.data || []);
        setEntityMap(data.entityMap || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchEdges(); }, []);

  const handleAdd = async () => {
    if (!fromId.trim() || !toId.trim()) return;
    const res = await fetch('/api/admin/edges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ edge: { from_id: fromId, to_id: toId, edge_type: edgeType } }),
    });
    if (res.ok) {
      setFromId('');
      setToId('');
      fetchEdges();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.edges.delete') + '?')) return;
    const res = await fetch('/api/admin/edges', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) fetchEdges();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('admin.nav.edges')}</h1>

      <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <EntityPicker label={t('admin.edges.fromEntity')} value={fromId} onChange={setFromId} />
          <div>
            <label className="block text-sm font-medium mb-1">{t('admin.edges.edgeType')}</label>
            <select
              value={edgeType}
              onChange={e => setEdgeType(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              {EDGE_TYPES.map(et => <option key={et} value={et}>{edgeTypeLabel(et, t)}</option>)}
            </select>
          </div>
          <EntityPicker label={t('admin.edges.toEntity')} value={toId} onChange={setToId} />
        </div>
        <button
          onClick={handleAdd}
          disabled={!fromId.trim() || !toId.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
        >
          <Plus size={16} />
          {t('admin.edges.create')}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <table className="text-sm" style={{ tableLayout: 'fixed', width: widths.reduce((a, b) => a + b, 0) }}>
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              {[
                t('admin.edges.fromEntity'),
                t('admin.edges.edgeType'),
                t('admin.edges.toEntity'),
                t('admin.edges.label') || 'Label',
                t('admin.edges.weight') || 'Weight',
                t('admin.edges.createdAt') || 'Created',
                '',
              ].map((label, i) => (
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
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{t('common.loading')}</td></tr>
            ) : edges.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{t('common.noResults')}</td></tr>
            ) : edges.map(e => (
              <tr key={e.id} className="border-b border-gray-100 dark:border-gray-800" title={e.id}>
                <td className="px-4 py-2 break-words">
                  <div>{entityName(e.from_id)}</div>
                  <div className="text-xs text-gray-400 font-mono break-all">{e.from_id}</div>
                </td>
                <td className="px-4 py-2 break-words">{edgeTypeLabel(e.edge_type, t)}</td>
                <td className="px-4 py-2 break-words">
                  <div>{entityName(e.to_id)}</div>
                  <div className="text-xs text-gray-400 font-mono break-all">{e.to_id}</div>
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">
                  {(locale === 'zh-Hans' ? e.label_zh || e.label_en : e.label_en || e.label_zh) || '—'}
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">{e.weight ?? '—'}</td>
                <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                  {e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-2">
                  <button onClick={() => handleDelete(e.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
