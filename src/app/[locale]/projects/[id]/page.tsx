'use client';

import { use } from 'react';
import { useEntity } from '@/domain/hooks';
import { useI18n } from '@/lib/i18n/provider';
import { EntityHeader } from '@/components/entity/entity-header';
import { EntityContent } from '@/components/entity/entity-content';
import { EntityRelations } from '@/components/entity/entity-relations';
import { BacklinksPanel } from '@/components/entity/backlinks-panel';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: entity, loading, error } = useEntity(id);
  const { t } = useI18n();

  if (loading) return <div className="animate-pulse h-96 bg-surface-2 rounded-lg" />;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!entity) return <p className="text-gray-500">{t('common.noResults')}</p>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <EntityHeader entity={entity} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <EntityContent entity={entity} />
        </div>
        <aside className="space-y-6">
          <EntityRelations edges={entity.edges_out} />
          <BacklinksPanel edges={entity.edges_in} />
        </aside>
      </div>
    </div>
  );
}
