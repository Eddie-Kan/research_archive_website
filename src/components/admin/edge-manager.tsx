'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { edgeTypeLabel } from '@/lib/admin/label-helpers';
import { EntityPicker } from './entity-picker';
import { Plus, Trash2 } from 'lucide-react';

interface EdgeData {
  id: string;
  from_id: string;
  to_id: string;
  edge_type: string;
  label?: { en: string; 'zh-Hans': string };
  weight?: number;
}

const EDGE_TYPES = [
  'project_contains', 'produced', 'evaluated_on', 'cites',
  'derived_from', 'implements', 'collaborates_with', 'related_to', 'supersedes',
];

interface EntityInfo {
  title_en: string | null;
  title_zh: string | null;
  type: string;
}

interface EdgeManagerProps {
  entityId: string;
  entityTitle?: { en?: string; 'zh-Hans'?: string };
  edges: EdgeData[];
  entityMap: Record<string, EntityInfo>;
  onAdd: (edge: Omit<EdgeData, 'id'>) => void;
  onRemove: (edgeId: string) => void;
}

export function EdgeManager({ entityId, entityTitle, edges, entityMap, onAdd, onRemove }: EdgeManagerProps) {
  const { t, locale } = useI18n();
  const [targetId, setTargetId] = useState('');
  const [edgeType, setEdgeType] = useState('related_to');
  const [direction, setDirection] = useState<'from' | 'to'>('from');

  const displayName = (id: string) => {
    const info = entityMap[id];
    if (info) {
      return (locale === 'zh-Hans' ? info.title_zh || info.title_en : info.title_en || info.title_zh) || id;
    }
    if (id === entityId && entityTitle) {
      return (locale === 'zh-Hans' ? entityTitle['zh-Hans'] || entityTitle.en : entityTitle.en || entityTitle['zh-Hans']) || id;
    }
    return id;
  };

  const currentName = displayName(entityId);

  const handleAdd = () => {
    if (!targetId.trim()) return;
    onAdd({
      from_id: direction === 'from' ? entityId : targetId,
      to_id: direction === 'from' ? targetId : entityId,
      edge_type: edgeType,
    });
    setTargetId('');
  };

  const nameSpan = (name: string, isSelf: boolean) => (
    <span className={isSelf ? 'text-brand-600 dark:text-brand-400 font-medium' : 'text-purple-600 dark:text-purple-400 font-medium'}>{name}</span>
  );

  const renderTitle = (edge: EdgeData) => {
    const isForward = edge.from_id === entityId;
    const otherName = displayName(isForward ? edge.to_id : edge.from_id);
    const key = `admin.edges.sentence.${edge.edge_type}_${isForward ? 'fwd' : 'rev'}`;
    const tpl = t(key);
    if (tpl !== key) {
      const parts = tpl.split(/(\{self\}|\{other\})/);
      return <>{parts.map((p, i) =>
        p === '{self}' ? <span key={i}>{nameSpan(currentName, true)}</span> :
        p === '{other}' ? <span key={i}>{nameSpan(otherName, false)}</span> :
        <span key={i}>{p}</span>
      )}</>;
    }
    return <>{nameSpan(currentName, true)} → {nameSpan(otherName, false)}</>;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{t('admin.edges.hint')}</p>
      <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('admin.edges.direction')}</label>
            <select
              value={direction}
              onChange={e => setDirection(e.target.value as 'from' | 'to')}
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              <option value="from">{currentName} → target</option>
              <option value="to">target → {currentName}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('admin.edges.edgeType')}</label>
            <select
              value={edgeType}
              onChange={e => setEdgeType(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              {EDGE_TYPES.map(et => (
                <option key={et} value={et}>{edgeTypeLabel(et, t)}</option>
              ))}
            </select>
          </div>
          <EntityPicker
            label={direction === 'from' ? t('admin.edges.toEntity') : t('admin.edges.fromEntity')}
            value={targetId}
            onChange={setTargetId}
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!targetId.trim()}
          className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          <Plus size={14} />
          {t('admin.edges.create')}
        </button>
      </div>

      {edges.length > 0 && (
        <div className="space-y-1">
          {edges.map(edge => (
            <div
              key={edge.id}
              className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm"
            >
              <span className="text-sm">{renderTitle(edge)}</span>
              <button
                type="button"
                onClick={() => onRemove(edge.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
