'use client';
import Link from 'next/link';
import { useI18n, snakeToCamel } from '@/lib/i18n/provider';
import type { EdgeItem } from '@/domain/types';
import { ArrowRight } from 'lucide-react';

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

export function EntityRelations({ edges }: Props) {
  const { locale, t, localize } = useI18n();

  if (edges.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4">{t('entity.noRelations')}</p>
    );
  }

  // Group edges by edge_type
  const grouped = edges.reduce<Record<string, EdgeItem[]>>((acc, edge) => {
    const key = edge.edge_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(edge);
    return acc;
  }, {});

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
        {t('entity.relations')}
      </h2>
      {Object.entries(grouped).map(([edgeType, items]) => (
        <div key={edgeType}>
          <h3 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
            <ArrowRight size={12} />
            {edgeType.replace(/_/g, ' ')}
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
              const label = edge.label_en || edge.label_zh
                ? localize({
                    en: edge.label_en || '',
                    'zh-Hans': edge.label_zh || '',
                  })
                : null;

              return (
                <li key={edge.id}>
                  <Link
                    href={`/${locale}/${typePath}/${related.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-1 transition-colors group"
                  >
                    <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-gray-500 font-mono">
                      {t(`entity.${snakeToCamel(related.type)}`)}
                    </span>
                    <span className="text-sm text-brand-600 dark:text-brand-400 group-hover:underline truncate">
                      {title.text}
                    </span>
                    {label && (
                      <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                        {label.text}
                      </span>
                    )}
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
