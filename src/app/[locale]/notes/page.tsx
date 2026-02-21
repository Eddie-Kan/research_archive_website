'use client';

import { useState } from 'react';
import { useEntityList } from '@/domain/hooks';
import { useI18n } from '@/lib/i18n/provider';
import { EntityListView } from '@/components/entity/entity-list-view';
import { FacetSidebar } from '@/components/entity/facet-sidebar';
import type { ListFilters } from '@/domain/types';

export default function NotesPage() {
  const { t } = useI18n();
  const [filters, setFilters] = useState<ListFilters>({ type: 'note', page: 1, limit: 20 });
  const { data, loading, error } = useEntityList(filters);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">{t('nav.notes')}</h1>
      <div className="flex gap-6">
        <FacetSidebar filters={filters} onFilterChange={setFilters} />
        <div className="flex-1">
          {error && <p className="text-red-500">{error}</p>}
          <EntityListView
            data={data}
            loading={loading}
            filters={filters}
            onFilterChange={setFilters}
          />
        </div>
      </div>
    </div>
  );
}
