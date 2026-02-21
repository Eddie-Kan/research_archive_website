'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { entityTypeLabel, statusLabel, visibilityLabel } from '@/lib/admin/label-helpers';
import { BilingualInput } from './bilingual-input';
import { JsonArrayEditor } from './json-array-editor';
import { EntityTypeFields } from './entity-type-fields';

const ENTITY_TYPES = [
  'project', 'publication', 'experiment', 'dataset', 'model', 'repo', 'note',
  'lit_review', 'meeting', 'idea', 'skill', 'method', 'material_system',
  'metric', 'collaborator', 'institution', 'media',
];

const STATUS_OPTIONS = ['active', 'paused', 'completed', 'archived'];
const VISIBILITY_OPTIONS = ['private', 'unlisted', 'public'];

interface EntityFormProps {
  initialData?: Record<string, any>;
  onSave: (entity: Record<string, any>) => Promise<void>;
  isNew?: boolean;
}

export function EntityForm({ initialData, onSave, isNew = false }: EntityFormProps) {
  const { t } = useI18n();
  const [entity, setEntity] = useState<Record<string, any>>(initialData || {
    type: 'note',
    title: { en: '', 'zh-Hans': '' },
    summary: { en: '', 'zh-Hans': '' },
    status: 'active',
    visibility: 'private',
    tags: [],
    authorship: { owner_role: 'owner', contributors: [] },
    source_of_truth: { kind: 'file', pointer: '' },
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const update = (updates: Record<string, any>) => {
    setEntity(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setIsError(false);
    try {
      await onSave(entity);
      setMessage(t('admin.entities.saved'));
    } catch (err: any) {
      setIsError(true);
      setMessage(err.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const title = entity.title || { en: '', 'zh-Hans': '' };
  const summary = entity.summary || { en: '', 'zh-Hans': '' };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {/* Base fields */}
      <div className="space-y-4">
        {isNew ? (
          <div>
            <label className="block text-sm font-medium mb-1">{t('admin.form.type')}</label>
            <select
              value={entity.type}
              onChange={e => update({ type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              {ENTITY_TYPES.map(typ => (
                <option key={typ} value={typ}>{entityTypeLabel(typ, t)}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            {t('admin.form.type')}: <span className="font-medium text-gray-700 dark:text-gray-300">{entityTypeLabel(entity.type, t)}</span>
            {entity.id && <> &middot; ID: <span className="font-mono">{entity.id}</span></>}
          </div>
        )}

        <BilingualInput
          label={t('common.title')}
          valueEn={title.en || ''}
          valueZh={title['zh-Hans'] || ''}
          onChangeEn={v => update({ title: { ...title, en: v } })}
          onChangeZh={v => update({ title: { ...title, 'zh-Hans': v } })}
          required
        />

        <BilingualInput
          label={t('entity.summary')}
          valueEn={summary.en || ''}
          valueZh={summary['zh-Hans'] || ''}
          onChangeEn={v => update({ summary: { ...summary, en: v } })}
          onChangeZh={v => update({ summary: { ...summary, 'zh-Hans': v } })}
          multiline
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('common.status')}</label>
            <select
              value={entity.status || 'active'}
              onChange={e => update({ status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{statusLabel(s, t)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('common.visibility')}</label>
            <select
              value={entity.visibility || 'private'}
              onChange={e => update({ visibility: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              {VISIBILITY_OPTIONS.map(v => (
                <option key={v} value={v}>{visibilityLabel(v, t)}</option>
              ))}
            </select>
          </div>
        </div>

        <JsonArrayEditor
          label={t('common.tags')}
          values={entity.tags || []}
          onChange={v => update({ tags: v })}
          placeholder={t('admin.form.addTag')}
        />
      </div>

      {/* Type-specific fields */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4">{t('admin.form.typeSpecificFields')}</h3>
        <EntityTypeFields entity={entity} onChange={update} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {saving ? t('common.loading') : t('common.save')}
        </button>
        {message && (
          <span className={`text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
