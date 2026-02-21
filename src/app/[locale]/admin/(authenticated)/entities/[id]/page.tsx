'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n/provider';
import * as Tabs from '@radix-ui/react-tabs';
import { EntityForm } from '@/components/admin/entity-form';
import { MdxEditor } from '@/components/admin/mdx-editor';
import { EdgeManager } from '@/components/admin/edge-manager';

interface EdgeData {
  id: string;
  from_id: string;
  to_id: string;
  edge_type: string;
  label?: { en: string; 'zh-Hans': string };
  weight?: number;
}

export default function EditEntityPage() {
  const { t } = useI18n();
  const params = useParams();
  const entityId = params.id as string;

  const [entity, setEntity] = useState<Record<string, any> | null>(null);
  const [bodyEn, setBodyEn] = useState('');
  const [bodyZh, setBodyZh] = useState('');
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [entityMap, setEntityMap] = useState<Record<string, { title_en: string | null; title_zh: string | null; type: string }>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/entities/${entityId}`).then(r => r.json()),
      fetch(`/api/admin/edges`).then(r => r.json()),
    ]).then(([entityData, edgesData]) => {
      if (entityData.raw_metadata) {
        try {
          const parsed = JSON.parse(entityData.raw_metadata);
          setEntity(parsed);
        } catch {
          setEntity(entityData);
        }
      } else {
        setEntity(entityData);
      }
      setBodyEn(entityData.body_en || '');
      setBodyZh(entityData.body_zh || '');

      setEntityMap(edgesData.entityMap || {});
      const allEdges = (edgesData.data || []) as EdgeData[];
      setEdges(allEdges.filter(e => e.from_id === entityId || e.to_id === entityId));
      setLoading(false);
    }).catch((err) => {
      setLoadError(err instanceof Error ? err.message : t('common.error'));
      setLoading(false);
    });
  }, [entityId]);

  const handleSaveEntity = async (entityData: Record<string, any>) => {
    const res = await fetch(`/api/admin/entities/${entityId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({
        entity: entityData,
        body_en: bodyEn,
        body_zh: bodyZh,
        expected_updated_at: entity?.updated_at,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.details?.join(', ') || data.error || 'Failed to save');
    }
    // Update local updated_at so subsequent saves use the new value
    setEntity(prev => prev ? { ...prev, updated_at: data.updated_at } : prev);
  };

  const handleSaveBody = async () => {
    for (const [locale, content] of [['en', bodyEn], ['zh-Hans', bodyZh]] as const) {
      const res = await fetch(`/api/admin/entities/${entityId}/body`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ locale, content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save body');
      }
    }
    // Refresh updated_at to avoid false optimistic locking conflicts on subsequent metadata saves
    const refreshed = await fetch(`/api/admin/entities/${entityId}`).then(r => r.json());
    if (refreshed?.updated_at) {
      setEntity(prev => prev ? { ...prev, updated_at: refreshed.updated_at } : prev);
    }
  };

  const handleAddEdge = async (edge: Omit<EdgeData, 'id'>) => {
    const res = await fetch('/api/admin/edges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ edge }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.details?.join(', ') || data.error || 'Failed to add edge');
    }
    setEdges(prev => [...prev, { ...edge, id: data.id }]);
  };

  const handleRemoveEdge = async (edgeId: string) => {
    const res = await fetch('/api/admin/edges', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ id: edgeId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to remove edge');
    }
    setEdges(prev => prev.filter(e => e.id !== edgeId));
  };

  if (loading) return <p className="text-gray-500">{t('common.loading')}</p>;
  if (loadError) return <p className="text-red-500">{loadError}</p>;
  if (!entity) return <p className="text-red-500">Entity not found</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('admin.entities.edit')}</h1>

      <Tabs.Root defaultValue="metadata">
        <Tabs.List className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
          <Tabs.Trigger value="metadata" className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-brand-600 data-[state=active]:text-brand-700 dark:data-[state=active]:text-brand-300 text-gray-500">
            {t('admin.editor.metadata')}
          </Tabs.Trigger>
          <Tabs.Trigger value="content" className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-brand-600 data-[state=active]:text-brand-700 dark:data-[state=active]:text-brand-300 text-gray-500">
            {t('admin.editor.content')}
          </Tabs.Trigger>
          <Tabs.Trigger value="relations" className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-brand-600 data-[state=active]:text-brand-700 dark:data-[state=active]:text-brand-300 text-gray-500">
            {t('admin.editor.relations')}
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="metadata">
          <EntityForm initialData={entity} onSave={handleSaveEntity} />
        </Tabs.Content>

        <Tabs.Content value="content">
          <div className="space-y-4">
            <MdxEditor
              bodyEn={bodyEn}
              bodyZh={bodyZh}
              onChangeEn={setBodyEn}
              onChangeZh={setBodyZh}
            />
            <button
              onClick={handleSaveBody}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {t('common.save')}
            </button>
          </div>
        </Tabs.Content>

        <Tabs.Content value="relations">
          <EdgeManager
            entityId={entityId}
            entityTitle={entity?.title}
            edges={edges}
            entityMap={entityMap}
            onAdd={handleAddEdge}
            onRemove={handleRemoveEdge}
          />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
