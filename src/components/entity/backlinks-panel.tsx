'use client';
import Link from 'next/link';
import { useI18n, snakeToCamel } from '@/lib/i18n/provider';
import type { EdgeItem } from '@/domain/types';
import { ArrowLeft } from 'lucide-react';

interface Props {
  edges: EdgeItem[];
}

const TYPE_PATH_MAP: Record<string, string> = {
  project: 'projects',
  publication: 'publications',
  experiment: 'experiments',
  dataset: 'datasets',
  model: 'models',
  note: 'notes',
  idea: 'ideas',
};

export function BacklinksPanel({ edges }: Props) {
  const { locale, t, localize } = useI18n();

  if (edges.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4">{t('entity.noBacklinks')}</p>
    );
  }

  // Group by source entity type
  const grouped = edges.reduce<Record<string, EdgeItem[]>>((acc, edge) => {
    const key = edge.related_entity?.type || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(edge);
    return acc;
  }, {});

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
        {t('entity.backlinks')}
      </h2>
      {Object.entries(grouped).map(([entityType, items]) => (
        <div key={entityType}>
          <h3 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
            <ArrowLeft size={12} />
            <span>{t(`entity.${snakeToCamel(entityType)}`)}</span>
            <span className="text-gray-300">({items.length})</span>
          </h3>
          <ul className="space-y-1">
            {items.map(edge => {
              const related = edge.related_entity;
              if (!related) return null;

              const title = localize({
                en: related.title_en,
                'zh-Hans': related.title_zh,
              });
              const typePath = TYPE_PATH_MAP[related.type] || 'projects';

              return (
                <li key={edge.id}>
                  <Link
                    href={`/${locale}/${typePath}/${related.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-1 transition-colors group"
                  >
                    <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-gray-500 font-mono">
                      {edge.edge_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm text-brand-600 dark:text-brand-400 group-hover:underline truncate">
                      {title.text}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
