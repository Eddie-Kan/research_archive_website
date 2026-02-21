'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEntityList } from '@/domain/hooks';
import { useI18n, snakeToCamel } from '@/lib/i18n/provider';
import { EntityListView } from '@/components/entity/entity-list-view';
import { FacetSidebar } from '@/components/entity/facet-sidebar';
import type { ListFilters } from '@/domain/types';

type RegistryEntry = 'home-total' | 'home-type' | 'home-status' | 'home-visibility';
type ContextKind = 'type' | 'status' | 'visibility';

function splitFilterValues(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function summarizeLabels(labels: string[]): string {
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  return `${labels[0]} +${labels.length - 1}`;
}

export default function RegistryPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const entry = searchParams.get('entry') as RegistryEntry | null;

  const [filters, setFilters] = useState<ListFilters>(() => ({
    type: searchParams.get('type') || undefined,
    status: searchParams.get('status') || undefined,
    visibility: searchParams.get('visibility') || undefined,
    page: 1,
    limit: 20,
  }));

  const { data, loading, error } = useEntityList(filters);

  const translateSafely = (key: string, fallback: string) => {
    const translated = t(key);
    if (translated === key || translated.startsWith('⟦MISSING:')) return fallback;
    return translated;
  };

  const typeLabel = summarizeLabels(
    splitFilterValues(filters.type).map((type) =>
      translateSafely(`entity.${snakeToCamel(type)}`, type)
    )
  );
  const statusLabel = summarizeLabels(
    splitFilterValues(filters.status).map((status) =>
      translateSafely(`status.${status}`, status)
    )
  );
  const visibilityLabel = summarizeLabels(
    splitFilterValues(filters.visibility).map((visibility) =>
      translateSafely(`visibility.${visibility}`, visibility)
    )
  );

  const contexts: Array<{ kind: ContextKind; label: string; dimension: string }> = [];
  if (typeLabel) contexts.push({ kind: 'type', label: typeLabel, dimension: t('stats.byType') });
  if (statusLabel) contexts.push({ kind: 'status', label: statusLabel, dimension: t('stats.byStatus') });
  if (visibilityLabel) contexts.push({ kind: 'visibility', label: visibilityLabel, dimension: t('stats.byVisibility') });

  const preferredKindByEntry: Record<RegistryEntry, ContextKind | null> = {
    'home-total': null,
    'home-type': 'type',
    'home-status': 'status',
    'home-visibility': 'visibility',
  };

  const preferredKind = entry ? preferredKindByEntry[entry] : null;
  const selectedContext = preferredKind
    ? contexts.find((ctx) => ctx.kind === preferredKind) || contexts[0]
    : contexts[0];

  const countText = data ? `${data.total.toLocaleString()} ${t('common.results')}` : '';

  const pageTitle = selectedContext
    ? t('dashboard.registry.filteredTitle', { label: selectedContext.label })
    : entry === 'home-total'
      ? t('dashboard.registry.allEntitiesTitle')
      : t('dashboard.registry.title');

  const baseDescription = selectedContext
    ? t('dashboard.registry.filteredDescription', {
      dimension: selectedContext.dimension,
      label: selectedContext.label,
    })
    : entry === 'home-total'
      ? t('stats.totalEntities')
      : t('dashboard.registry.description');

  const pageDescription = countText
    ? t('dashboard.registry.descriptionWithCount', { base: baseDescription, count: countText })
    : baseDescription;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">{pageTitle}</h1>
      <p className="text-sm text-gray-500 mb-6">{pageDescription}</p>
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
